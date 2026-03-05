import { describe, it, expect } from "bun:test";
import Elysia from "elysia";
import { baristaErrorHandler } from "./index";
import {
	BadRequestException,
	ResourceNotFoundException as AppResourceNotFoundException,
	UnauthorizedException,
	InvalidOperationException,
	ResourceAlreadyExistsException,
	InvalidJWTException,
	UnableToSignPayloadException,
} from "@roastery/terroir/exceptions/application";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import {
	CacheUnavailableException,
	ConflictException,
	DatabaseUnavailableException,
	ForeignDependencyConstraintException,
	InvalidEnvironmentException,
	MissingPluginDependencyException,
	OperationNotAllowedException,
	ResourceNotFoundException as InfraResourceNotFoundException,
	UnexpectedCacheValueException,
} from "@roastery/terroir/exceptions/infra";
import {
	InvalidEntityData,
	InvalidObjectValueException,
	UnknownException,
} from "@roastery/terroir/exceptions";

function createTestApp(error: unknown) {
	return new Elysia().use(baristaErrorHandler).get("/test", () => {
		throw error;
	});
}

async function request(app: Elysia) {
	const response = await app.handle(new Request("http://localhost/test"));
	const body = await response.json();
	return { status: response.status, body };
}

describe("baristaErrorHandler", () => {
	describe("erros genéricos (não-CoreException)", () => {
		it("retorna name, message e code para um Error padrão", async () => {
			const error = new Error("algo deu errado");
			const { status, body } = await request(createTestApp(error));

			expect(status).toBe(500);
			expect(body).toMatchObject({
				name: "Error",
				message: "algo deu errado",
			});
		});

		it("retorna o name correto para subclasses de Error", async () => {
			const error = new TypeError("tipo inválido");
			const { body } = await request(createTestApp(error));

			expect(body).toMatchObject({
				name: "TypeError",
				message: "tipo inválido",
			});
		});

		it("converte para string quando o erro não é um objeto Error", async () => {
			const { body } = await request(createTestApp("erro como string"));

			expect(body).toMatchObject({
				name: "Error",
				message: "erro como string",
			});
		});
	});

	describe("camada de domínio", () => {
		it("retorna 400 para InvalidDomainDataException", async () => {
			const { status, body } = await request(
				createTestApp(new InvalidDomainDataException("UserEntity")),
			);
			expect(status).toBe(400);
			expect(body).toMatchObject({ source: "UserEntity", layer: "domain" });
		});

		it("retorna 400 para InvalidPropertyException", async () => {
			const { status, body } = await request(
				createTestApp(
					new InvalidPropertyException(
						"email",
						"UserEntity",
						"formato inválido",
					),
				),
			);
			expect(status).toBe(400);
			expect(body).toMatchObject({ source: "UserEntity", layer: "domain" });
		});

		it("retorna 406 para OperationFailedException", async () => {
			const { status, body } = await request(
				createTestApp(new OperationFailedException("OrderService")),
			);
			expect(status).toBe(406);
			expect(body).toMatchObject({ source: "OrderService", layer: "domain" });
		});
	});

	describe("camada de aplicação", () => {
		it("retorna 400 para BadRequestException", async () => {
			const { status, body } = await request(
				createTestApp(new BadRequestException("UserController")),
			);
			expect(status).toBe(400);
			expect(body).toMatchObject({
				source: "UserController",
				layer: "application",
			});
		});

		it("retorna 401 para UnauthorizedException", async () => {
			const { status, body } = await request(
				createTestApp(new UnauthorizedException("AuthGuard")),
			);
			expect(status).toBe(401);
			expect(body).toMatchObject({ layer: "application" });
		});

		it("retorna 400 para InvalidJWTException", async () => {
			const { status } = await request(
				createTestApp(new InvalidJWTException("JwtService")),
			);
			expect(status).toBe(400);
		});

		it("retorna 406 para InvalidOperationException", async () => {
			const { status } = await request(
				createTestApp(new InvalidOperationException("PaymentService")),
			);
			expect(status).toBe(406);
		});

		it("retorna 409 para ResourceAlreadyExistsException", async () => {
			const { status } = await request(
				createTestApp(new ResourceAlreadyExistsException("UserRepository")),
			);
			expect(status).toBe(409);
		});

		it("retorna 404 para ResourceNotFoundException (application)", async () => {
			const { status } = await request(
				createTestApp(new AppResourceNotFoundException("UserRepository")),
			);
			expect(status).toBe(404);
		});

		it("retorna 500 para UnableToSignPayloadException", async () => {
			const { status } = await request(
				createTestApp(new UnableToSignPayloadException("JwtService")),
			);
			expect(status).toBe(500);
		});
	});

	describe("camada de infraestrutura", () => {
		it("retorna 409 para ConflictException", async () => {
			const { status, body } = await request(
				createTestApp(new ConflictException("PostgresRepository")),
			);
			expect(status).toBe(409);
			expect(body).toMatchObject({ layer: "infra" });
		});

		it("retorna 503 para DatabaseUnavailableException", async () => {
			const { status } = await request(
				createTestApp(new DatabaseUnavailableException("PostgresRepository")),
			);
			expect(status).toBe(503);
		});

		it("retorna 500 para ForeignDependencyConstraintException", async () => {
			const { status } = await request(
				createTestApp(
					new ForeignDependencyConstraintException("PostgresRepository"),
				),
			);
			expect(status).toBe(500);
		});

		it("retorna 502 para OperationNotAllowedException", async () => {
			const { status } = await request(
				createTestApp(new OperationNotAllowedException("ExternalApiClient")),
			);
			expect(status).toBe(502);
		});

		it("retorna 404 para ResourceNotFoundException (infra)", async () => {
			const { status } = await request(
				createTestApp(new InfraResourceNotFoundException("PostgresRepository")),
			);
			expect(status).toBe(404);
		});

		it("retorna 500 para UnexpectedCacheValueException", async () => {
			const { status } = await request(
				createTestApp(
					new UnexpectedCacheValueException("user:123", "RedisCache"),
				),
			);
			expect(status).toBe(500);
		});

		it("retorna 503 para MissingPluginDependencyException", async () => {
			const { status } = await request(
				createTestApp(new MissingPluginDependencyException("ElysiaJwt")),
			);
			expect(status).toBe(503);
		});

		it("retorna 500 para InvalidEnvironmentException", async () => {
			const { status } = await request(
				createTestApp(new InvalidEnvironmentException("AppConfig")),
			);
			expect(status).toBe(500);
		});

		it("retorna 503 para CacheUnavailableException", async () => {
			const { status } = await request(
				createTestApp(new CacheUnavailableException("RedisCache")),
			);
			expect(status).toBe(503);
		});
	});

	describe("camada interna", () => {
		it("retorna 500 para InvalidEntityData", async () => {
			const { status } = await request(
				createTestApp(new InvalidEntityData("estrutura inválida")),
			);
			expect(status).toBe(500);
		});

		it("retorna 500 para InvalidObjectValueException", async () => {
			const { status } = await request(
				createTestApp(new InvalidObjectValueException("userId")),
			);
			expect(status).toBe(500);
		});

		it("retorna 500 para UnknownException", async () => {
			const { status } = await request(
				createTestApp(new UnknownException("erro desconhecido")),
			);
			expect(status).toBe(500);
		});
	});

	describe("formato da resposta para CoreException", () => {
		it("retorna message, name, source e layer no corpo", async () => {
			const { body } = await request(
				createTestApp(
					new BadRequestException(
						"UserController",
						"campo obrigatório ausente",
					),
				),
			);
			expect(body).toMatchObject({
				message: "campo obrigatório ausente",
				source: "UserController",
				layer: "application",
			});
			expect(body).toHaveProperty("name");
		});

		it("usa status 500 como fallback quando a exceção não está mapeada", async () => {
			const { status } = await request(createTestApp(new UnknownException()));
			expect(status).toBe(500);
		});
	});
});
