import { parse } from 'graphql';
import { validate } from 'graphql/validation';
import { buildASTSchema } from 'graphql/utilities/buildASTSchema';
import { GraphQLError } from 'graphql/error';
import { validateSDL } from 'graphql/validation/validate';
import { validateSchema } from 'graphql/type/validate';

export function validateSchemaDefinition(
  schemaDefinition,
  rules,
  configuration
) {
  let ast;

  let parseOptions = {};
  if (configuration.getOldImplementsSyntax()) {
    parseOptions.allowLegacySDLImplementsInterfaces = true;
  }

  try {
    ast = parse(schemaDefinition, parseOptions);
  } catch (e) {
    if (e instanceof GraphQLError) {
      e.ruleName = 'graphql-syntax-error';

      return [e];
    } else {
      throw e;
    }
  }

  let schemaErrors = validateSDL(ast);
  if (schemaErrors.length > 0) {
    return sortErrors(
      schemaErrors.map(error => {
        error.ruleName = 'invalid-graphql-schema';

        return error;
      })
    );
  }

  const schema = buildASTSchema(ast, {
    commentDescriptions: configuration.getCommentDescriptions(),
    assumeValidSDL: true,
    assumeValid: true,
  });

  schema.__validationErrors = undefined;
  schemaErrors = validateSchema(schema);
  if (schemaErrors.length > 0) {
    return sortErrors(
      schemaErrors.map(error => {
        error.ruleName = 'invalid-graphql-schema';

        return error;
      })
    );
  }

  const rulesWithConfiguration = rules.map(rule => {
    return ruleWithConfiguration(rule, configuration);
  });

  const errors = validate(schema, ast, rulesWithConfiguration);
  const sortedErrors = sortErrors(errors);

  return sortedErrors;
}

function sortErrors(errors) {
  return errors.sort((a, b) => {
    return a.locations[0].line - b.locations[0].line;
  });
}

function ruleWithConfiguration(rule, configuration) {
  if (rule.length == 2) {
    return function(context) {
      return rule(configuration, context);
    };
  } else {
    return rule;
  }
}
