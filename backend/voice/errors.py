class VoiceError(Exception):
    """Error with an HTTP status and a message that is safe to show to the customer."""

    status_code = 500

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class AudioValidationError(VoiceError):
    status_code = 400


class STTUnavailableError(VoiceError):
    status_code = 503


class STTError(VoiceError):
    status_code = 502


class EmptyTranscriptError(VoiceError):
    status_code = 422


class InvalidLLMResponseError(VoiceError):
    status_code = 502


class CelebrationAccessError(VoiceError):
    status_code = 403
