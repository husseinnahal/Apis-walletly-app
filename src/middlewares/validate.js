import Joi from 'joi';
import ApiError from '../utils/ApiError.js';

const validate = schema => {
     return (req, res, next) => {
          const validationOptions = {
               abortEarly: false, // return all errors, not just the first one
               allowUnknown: true, // allow unknown keys that will be ignored
               stripUnknown: true, // remove unknown keys from validated data
          };

          const { error, value } = schema.validate(
               {
                    body: req.body,
                    query: req.query,
                    params: req.params,
               },
               validationOptions
          );

          if (error) {
               const errorMessage = error.details.map(detail => detail.message).join(', ');
               return next(ApiError.badRequest(errorMessage));
          }

          // replace request data with validated data
          Object.assign(req, value);
          return next();
     };
};

// helper to create validation schemas
export const createSchema = schema => {
     return Joi.object({
          body: schema.body ? Joi.object(schema.body) : Joi.object(),
          query: schema.query ? Joi.object(schema.query) : Joi.object(),
          params: schema.params ? Joi.object(schema.params) : Joi.object(),
     });
};

export default validate;
