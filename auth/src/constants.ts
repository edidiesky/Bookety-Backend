export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;

/**
 * RETRIES
 */
export const BUKETY_MAX_RETRIES = 6
export const BUKETY_MAX_TIMEOUT = 500

/**
 * ROUTING KEYS
 */
// mostyl notification routing keys for notification exchange
export const BOOKETY_AUTH_RESET_PASSWORD_TOKEN_NOTIFICATION_TOPIC =
  "bukety.auth.reset.password.token.notification.topic";
export const BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC =
  "bukety.auth.2fa.token.notification.topic";
export const BOOKETY_AUTH_SIGNIN_NOTIFICATION_TOPIC =
  "bukety.auth.sigin.token.notification.topic";
export const BOOKETY_CUSTOMER_ACTIVITY_TOPIC = "bukety.customer.activity.topic";

export const BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC =
  "bukety.customer.auth.validation.topic";
export const BOOKETY_AUTH_DLQ = "bukety.auth.dlq.topic";

/**
 * EXCHANGES
 */
export const NOTIFICATION_EXCHANGE = "notification_exchange";
export const AUTH_EXCHANGE = "auth_exchange";
export const ACTIVITY_EXCHANGE = "activity_exchange";

export const QUEUE = {
  [BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC]:
    "bukety.customer.auth.validation.queue",
  [BOOKETY_AUTH_DLQ]: "bukety.auth.dlq.queue",
};
