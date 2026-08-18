import type { Buffer } from "node:buffer";
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * General app-wide S3 / MinIO object storage.
 *
 * Configured entirely from `S3_*` env vars. MinIO (and most self-hosted
 * S3-compatibles) require path-style addressing, enabled via
 * `S3_FORCE_PATH_STYLE=true`.
 *
 * Deliberately reads `process.env` directly instead of going through
 * [env.ts](src/lib/env.ts): that module throws at import time on any missing var,
 * and an app that never uploads a file should not be forced to run object
 * storage. Everything here fails lazily, at first use, with a clear message.
 */

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "ap-southeast-1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

function getBucket(): string {
	if (!bucket) throw new Error("S3_BUCKET is not configured");
	return bucket;
}

let client: S3Client | null = null;

function getClient(): S3Client {
	if (client) return client;
	if (!accessKeyId || !secretAccessKey) {
		throw new Error("S3 credentials are not configured");
	}
	client = new S3Client({
		region,
		endpoint,
		forcePathStyle,
		credentials: { accessKeyId, secretAccessKey },
	});
	return client;
}

/** Presigned GET URL, valid for `expiresIn` seconds (default 1h). */
export async function getPresignedGetUrl(
	key: string,
	expiresIn = 3600,
): Promise<string> {
	const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
	return getSignedUrl(getClient(), command, { expiresIn });
}

/** Raw object bytes at `key`, or null when the object is absent. */
export async function getObject(key: string): Promise<Uint8Array | null> {
	try {
		const res = await getClient().send(
			new GetObjectCommand({ Bucket: getBucket(), Key: key }),
		);
		const body = res.Body as {
			transformToByteArray?: () => Promise<Uint8Array>;
		};
		if (!body?.transformToByteArray) return null;
		return await body.transformToByteArray();
	} catch {
		return null;
	}
}

/** Whether an object exists at `key`. */
export async function objectExists(key: string): Promise<boolean> {
	try {
		await getClient().send(
			new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
		);
		return true;
	} catch {
		return false;
	}
}

/** Object metadata (ETag / LastModified), or null when the object is absent. */
export async function getObjectMeta(
	key: string,
): Promise<{ etag?: string; lastModified?: Date } | null> {
	try {
		const res = await getClient().send(
			new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
		);
		return { etag: res.ETag, lastModified: res.LastModified };
	} catch {
		return null;
	}
}

/** Store bytes at `key`. */
export async function putObject(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string,
): Promise<void> {
	await getClient().send(
		new PutObjectCommand({
			Bucket: getBucket(),
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}
