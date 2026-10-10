package com.coffeestation.global.response;

/**
 * 모든 API의 공통 응답 형식
 * 성공: ApiResponse.ok(data)   실패: ApiResponse.fail("메시지")
 */
public record ApiResponse<T>(boolean success, T data, String message) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null);
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
