import { barista } from "@roastery/barista";
import { CoreException } from "@roastery/terroir/exceptions/core";
import { ExceptionLayer } from "@roastery/terroir/exceptions/symbols";
import type { RoasteryExceptionRecords } from "@roastery/terroir/exceptions/types";

const STATUS_CODE_MAP: RoasteryExceptionRecords<number> = {
	domain: {
		InvalidDomainDataException: 400,
		InvalidPropertyException: 400,
		OperationFailedException: 406,
	},
	application: {
		UnauthorizedException: 401,
		BadRequestException: 400,
		InvalidJWTException: 400,
		InvalidOperationException: 406,
		ResourceAlreadyExistsException: 409,
		ResourceNotFoundException: 404,
		UnableToSignPayloadException: 500,
	},
	infra: {
		ConflictException: 409,
		DatabaseUnavailableException: 503,
		ForeignDependencyConstraintException: 500,
		OperationNotAllowedException: 502,
		ResourceNotFoundException: 404,
		UnexpectedCacheValueException: 500,
		MissingPluginDependencyException: 503,
		InvalidEnvironmentException: 500,
		CacheUnavailableException: 503,
	},
	internal: {
		InvalidEntityData: 500,
		InvalidObjectValueException: 500,
		UnknownException: 500,
	},
};

export const baristaErrorHandler = barista({
	name: "@caffeine/api-error-handler",
}).onError({ as: "global" }, ({ code, set, error: _error }) => {
	if (!(_error instanceof CoreException)) {
		const err = _error as Error;
		const message = err.message || String(_error);
		const name = err.name || "Error";

		return { name, message, code };
	}

	const error: CoreException = _error;

	const layerMap = STATUS_CODE_MAP[error[ExceptionLayer]] as Record<
		string,
		number
	>;
	const status = layerMap ? layerMap[error.constructor.name] : 500;

	set.status = status ?? 500;

	const { message, name, source, [ExceptionLayer]: layer } = error;

	return { message, name, source, layer };
});
