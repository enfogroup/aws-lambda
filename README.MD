# Introduction

This package exposes functionality related to simplifying the process of working with AWS Lambda and API Gateway. In particular the response flow.

## Installation

```bash
npm install @enfo/aws-lambda --save
```

## Purpose of package

This package aims to simplify the response flow in an AWS Lambda invoked by API Gateway. It exposes functionality that allows for default responses, easy throwing from anywhere within your business logic and handling of those thrown errors. The philosophy behind the package is to separate AWS logic from the business as described as point #1 in [Best practices for working with AWS Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html). 

## APIGatewayHandlerError

APIGatewayHandlerError is an extension of Error. It should be thrown whenever you want a response in your code which is not a part of the happy path. If you for example fail to find a resource you can simply throw a new APIGatewayHandlerError with status code 404. Or if the invoker does not have access to a resource you can return a 403 with a specific message.

```typescript
import { APIGatewayHandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'

new APIGatewayHandlerError<string>({
  statusCode: HTTP_STATUS_CODE.NOT_FOUND, // HTTP status code to return to invoker
  body: 'Unable to find resource', // Optional body to include in response
  headers: { // Optional headers to include in response
    'my-header': 'cool-value'
  }
})
```

## APIGatewayHelper

APIGatewayHelper is the main class in this package. It exposes methods for setting default headers, responses, parsing JSON and most importantly executing your business logic in an error handling wrapper.

```typescript
import { APIGatewayHelper } from '@enfo/aws-lambda'
import logger from '@enfo/logger'

const helper = new APIGatewayHelper({
  accessControlAllowOrigin: 'myOrigin', // optional accessControlAllowOrigin header, defaults to '*'
  defaultHeaders: { // optional headers to include in ALL responses
    key: 'value'
  },
  logger: logger // optional logger used to log when errors occur
})
```

### Methods

* getAccessControlAllowOriginHeader - returns accessControlAllowOrigin header value
* getDefaultHeaders - returns default headers used in every response
* setFallbackError - used to set APIGatewayHandlerError used when something goes unintentionally wrong. Used by handleError and wrapLogic
* setJSONParseFailError - used to set APIGatewayHandlerError thrown when parsing of JSON fails due to a bad string. Used by parseJSON and parseJSONAsPartial
* setJSONParseFailError - used to set APIGatewayHandlerError thrown when input to parseJSON and parseJSONAsPartial is empty
* parseJSON<T> - used to parse a string to T
* parseJSONAsPartial<T> used to parse a string to RecursivePartial<T>. RecursivePartial is a type which makes every key in object optional. The main purpose of this function is to return a more realistic payload value which can then be used in validation using for example [joi](https://www.npmjs.com/package/joi)
* buildCustomResponse - builds a custom response. Set http status code, body,  headers and isBase64Encoded
* ok - returns a status 200 response. Set body, headers and isBase64Encoded
* clientError - returns a status 400 response. Set body, headers and isBase64Encoded
* serverError - returns a status 500 response. Set body, headers and isBase64Encoded
* handleError - takes a APIGatewayHandlerError or Error and returns a response. In the case of a regular Error it will attempt to log it using the logger provided in the constructor. In the case of a APIGatewayHandlerError it will be used to build the response
* wrapLogic - takes a business logic function, executes it while handling errors that might occur

## Examples

### Simple use

```typescript
import { APIGatewayHelper, APIGatewayHandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'
import logger from '@enfo/logger'

const helper = new APIGatewayHelper({
  accessControlAllowOrigin: 'myOrigin', // optional accessControlAllowOrigin header, defaults to '*'
  defaultHeaders: { // optional headers to include in ALL responses
    key: 'value'
  },
  logger: logger // optional logger used to log when errors occur
})

const handlerOne = async (event: AWSLambda.APIGatewayProxyEvent) => { // interface from @types/aws-lambda
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda X',
    logic: async () => {
      return helper.ok<string>({ body: 'Everything went fine!' })
    }
  })
}

const handlerTwo = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda Y',
    logic: async () => {
      const body = helper.parseJSON<{a: string}>(event.body) // will throw if something is wrong with the body, which will be handled by the wrapper
      return helper.buildCustomResponse({ statusCode: HTTP_STATUS_CODE.ACCEPTED, body })
    }
  })
}

const handlerThree = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda Z',
    logic: async () => {
      throw new APIGatewayHandlerError<string>({
        statusCode: HTTP_STATUS_CODE.NOT_FOUND,
        body: 'Unable to find resource'
      })
    }
  })
}

```

### Customizing error responses

```typescript
import { APIGatewayHelper, APIGatewayHandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'

const helper = new APIGatewayHelper({
  accessControlAllowOrigin: 'myOrigin', // optional accessControlAllowOrigin header, defaults to '*'
  defaultHeaders: { // optional headers to include in ALL responses
    key: 'value'
  }
})
```

Let us modify the JSONParseFailError and then use it. The response to the invoker will be status 400 and the object specified in the body

```typescript
helper.setJSONParseFailError(new APIGatewayHandlerError({
  statusCode: HTTP_STATUS_CODE.BAD_REQUEST,
  body: {
    message: 'Body in payload was not proper JSON'
  }
}))

const handlerOne = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda X',
    logic: async () => {
      helper.parseJSON('broken[}')
      return helper.ok<string>({ body: 'Everything went fine!' })
    }
  })
}
```

Now, let us have a look at modifying the fallback response. This response gets used whenever a regular Error gets thrown.

```typescript
helper.setFallbackError(new APIGatewayHandlerError({
  statusCode: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
  body: {
    message: 'Something went catastrophically wrong processing your request, I am sorry'
  }
}))

const handlerTwo = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda X',
    logic: async () => {
      throw new Error()
    }
  })
}
```

If you want to you can always use the building blocks to handle thrown errors on your own. The code you see below is essentially what wrapLogic does behind the scenes.

```typescript
const handlerThree = async (event: AWSLambda.APIGatewayProxyEvent) => {
  try{
    const body = helper.parseJSON(event.body)
    return helper.ok<string>(await doStuff(body))
  }catch(err){
    return helper.handleError(err, 'Something went wrong in lambda X')
  }
}
```

### Full example with file structure

Let us have a look at an example with two lambdas which are a part of a pets' API. This example describes an interface for all error returned by the API in the form of APIError. This is then used to modify the instance with the proper answers. Then it is finally consumed within two lambdas using wrapLogic. The logic itself inside "get" and "put" could throw a APIGatewayHandlerError to return a response.

```typescript
// errors.ts

export interface APIError {
  source: string;
  details: string;
}
```

```typescript
// init.ts
import { APIGatewayHandlerError, APIGatewayHelper, HTTP_STATUS_CODE } from '@enfo/aws-lambda'
import { APIError } from './errors'

const gatewayHelper = new APIGatewayHelper({})
gatewayHelper.setJSONParseFailError(new APIGatewayHandlerError<APIError>({
  statusCode: HTTP_STATUS_CODE.BAD_REQUEST,
  body: {
    source: 'Pets application',
    details: 'Bad JSON in body'
  }
}))
gatewayHelper.setJSONNoBodyError(new APIGatewayHandlerError<APIError>({
  statusCode: HTTP_STATUS_CODE.BAD_REQUEST,
  body: {
    source: 'Pets application',
    details: 'No body in request'
  }
}))
gatewayHelper.setFallbackError(new APIGatewayHandlerError<APIError>({
  statusCode: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
  body: {
    source: 'Pets application',
    details: 'Something went wrong processing your request. Sorry for the inconvenience'
  }
}))
```

```typescript
// handler.ts
import { HandlerResponse } from '@enfo/aws-lambda'

import { gatewayHelper } from './init'
import { APIError } from './errors.ts'

import { get, put } from './pets' // file containing actual database interaction

export const getPet = async (event: AWSLambda.APIGatewayProxyEvent): Promise<HandlerResponse> => {
  return gatewayHelper.wrapLogic({
    logic: () => {
      return gatewayHelper.ok({
        statusCode: HTTP_STATUS_CODE.OK,
        pet: await get(event.id)
      })
    },
    errorMessage: 'Something went wrong getting a pet'
  })
}

export const putPet = async (event: AWSLambda.APIGatewayProxyEvent): Promise<HandlerResponse> => {
  return gatewayHelper.wrapLogic({
    logic: () => {
      const body = gatewayHelper.parseJSONAsPartial(event.body)
      return gatewayHelper.ok({
        statusCode: HTTP_STATUS_CODE.OK,
        pet: await put(body)
      })
    },
    errorMessage: 'Something went wrong creating a pet'
  })
}
```
