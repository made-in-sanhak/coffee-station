package com.coffeestation.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 서비스에서 의도적으로 던지는 예외
 * 예) throw new BusinessException(HttpStatus.NOT_FOUND, "매장을 찾을 수 없습니다.");
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
