# @roastery-capsules/api-error-handler

Centralized API error handling and HTTP status code mapping for the [Roastery CMS](https://github.com/roastery-cms) ecosystem.

[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

## Overview

`baristaErrorHandler` is an [Elysia](https://elysiajs.com) plugin that intercepts all exceptions thrown in your application and maps them to the appropriate HTTP status codes. It natively understands the layered exception hierarchy from [`@roastery/terroir`](https://github.com/roastery-cms/terroir), returning structured error responses with full layer context.

## Technologies

| Tool | Purpose |
|------|---------|
| [Elysia](https://elysiajs.com) | HTTP framework and plugin system |
| [@roastery/barista](https://github.com/roastery-cms) | Elysia factory used across the Roastery ecosystem |
| [@roastery/terroir](https://github.com/roastery-cms/terroir) | Layered exception hierarchy |
| [Bun](https://bun.sh) | Runtime, test runner, and package manager |
| [tsup](https://tsup.egoist.dev) | Bundling to ESM + CJS with `.d.ts` generation |

## Installation

```bash
bun add @roastery-capsules/api-error-handler
```

Peer dependencies:

```bash
bun add @roastery/barista @roastery/terroir
```

## Usage

Register the plugin on your Elysia app:

```typescript
import { Elysia } from "elysia";
import { baristaErrorHandler } from "@roastery-capsules/api-error-handler";

const app = new Elysia()
  .use(baristaErrorHandler)
  .get("/users/:id", ({ params }) => {
    throw new ResourceNotFoundException("UserRepository", `User ${params.id} not found`);
  })
  .listen(3000);
```

The plugin registers a **global** error handler, so all routes and sub-apps are covered automatically.

### Response format

**CoreException** (any `@roastery/terroir` exception):

```json
{
  "name": "Resource Not Found",
  "message": "User 123 not found",
  "source": "UserRepository",
  "layer": "application"
}
```

**Generic error** (any other `Error` or thrown value):

```json
{
  "name": "Error",
  "message": "something went wrong",
  "code": "UNKNOWN"
}
```

## Status code mapping

### Domain layer

| Exception | Status |
|---|---|
| `InvalidDomainDataException` | 400 |
| `InvalidPropertyException` | 400 |
| `OperationFailedException` | 406 |

### Application layer

| Exception | Status |
|---|---|
| `BadRequestException` | 400 |
| `InvalidJWTException` | 400 |
| `UnauthorizedException` | 401 |
| `ResourceNotFoundException` | 404 |
| `InvalidOperationException` | 406 |
| `ResourceAlreadyExistsException` | 409 |
| `UnableToSignPayloadException` | 500 |

### Infrastructure layer

| Exception | Status |
|---|---|
| `ResourceNotFoundException` | 404 |
| `ConflictException` | 409 |
| `OperationNotAllowedException` | 502 |
| `DatabaseUnavailableException` | 503 |
| `MissingPluginDependencyException` | 503 |
| `CacheUnavailableException` | 503 |
| `ForeignDependencyConstraintException` | 500 |
| `UnexpectedCacheValueException` | 500 |
| `InvalidEnvironmentException` | 500 |

### Internal layer

All internal exceptions (`InvalidEntityData`, `InvalidObjectValueException`, `UnknownException`) map to **500**.

## Development

```bash
# Run tests
bun run test:unit

# Run tests with coverage
bun run test:coverage

# Build for distribution
bun run build

# Check for unused exports and dependencies
bun run knip

# Full setup (build + bun link)
bun run setup
```

## License

MIT
