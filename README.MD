# Introduction

This package exposes functionality related to simplifying the process of working with AWS Lambda and API Gateway. In particular the response flow.

## Installation

```bash
npm install @enfo/aws-lambda --save
```

## Purpose of package

This package aims to simplify the response flow in an AWS Lambda invoked by API Gateway. It exposes functionality that allows for default responses, easy throwing from anywhere within your business logic and handling of those thrown errors.

## HandlerError

HandlerError is an extension of Error. It should be thrown whenever you want a response in your code which is not a part of the happy path. If you for example fail to find a resource you can simply throw a new HandlerError with status code 404. Or if the invoker does not have access to a resource you can return a 403 with a specific message.

```typescript
import { HandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'

new HandlerError<string>({
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
* setFallbackError - used to set HandlerError used when something goes unintentionally wrong. Used by handleError and wrapLogic
* setJSONParseFailError - used to set HandlerError thrown when parsing of JSON fails due to a bad string. Used by parseJSON and parseJSONAsPartial
* setJSONParseFailError - used to set HandlerError thrown when input to parseJSON and parseJSONAsPartial is empty
* parseJSON<T> - used to parse a string to T
* parseJSONAsPartial<T> used to parse a string to RecursivePartial<T>. RecursivePartial is a type which makes every key in object optional. The main purpose of this function is to return a more realistic payload value which can then be used in validation using for example [joi](https://www.npmjs.com/package/joi)
* buildCustomResponse - builds a custom response. Set http status code, body and headers
* ok - returns a status 200 response. Set body and headers
* clientError - returns a status 400 response. Set body and headers
* serverError - returns a status 500 response. Set body and headers
* handleError - takes a HandlerError or Error and returns a response. In the case of a regular Error it will attempt to log it using the logger provided in the constructor. In the case of a HandlerError it will be used to build the response
* wrapLogic - takes a business logic function, executes it while handling errors that might occur

## Examples

Simple use

```typescript
import { APIGatewayHelper, HandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'
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
      return ok<string>('Everything went fine!')
    }
  })
}

const handlerTwo = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda Y',
    logic: async () => {
      const body = helper.parseJSON<{a: string}>(event.body) // will throw if something is wrong with the body, which will be handled by the wrapper
      return helper.buildCustomResponse(HTTP_STATUS_CODE.ACCEPTED)
    }
  })
}

const handlerThree = async (event: AWSLambda.APIGatewayProxyEvent) => {
  return helper.wrapLogic({
    errorMessage: 'Something went wrong in lambda Z',
    logic: async () => {
      throw new HandlerError<string>({
        statusCode: HTTP_STATUS_CODE.NOT_FOUND,
        body: 'Unable to find resource'
      })
    }
  })
}
```

Customizing error responses. Let us start by creating an APIGatewayHelper

```typescript
import { APIGatewayHelper, HandlerError, HTTP_STATUS_CODE } from '@enfo/aws-lambda'
import logger from '@enfo/logger'

const helper = new APIGatewayHelper({
  accessControlAllowOrigin: 'myOrigin', // optional accessControlAllowOrigin header, defaults to '*'
  defaultHeaders: { // optional headers to include in ALL responses
    key: 'value'
  },
  logger: logger // optional logger used to log when errors occur
})
```

Let us modify the JSONParseFailError and then use it. The response to the invoker will be status 400 and the object specified in the body

```typescript
helper.setJSONParseFailError(new HandlerError({
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
      return helper.ok<string>('Everything went fine!')
    }
  })
}
```

Now, let us have a look at modifying the fallback response. This response gets used whenever a regular Error gets thrown.

```typescript
helper.setFallbackError(new HandlerError({
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
