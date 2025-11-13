import { AxiosRequestConfig } from "axios";

// Define data type to avoid using 'any'
type RequestData = unknown;

declare module "axios" {
	export interface InternalAxiosRequestConfig<D = RequestData> extends AxiosRequestConfig<D> {
		_retry?: boolean;
		headers?: Record<string, string>;
	}
}
