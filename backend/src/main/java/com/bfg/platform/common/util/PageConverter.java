package com.bfg.platform.common.util;

import org.springframework.data.domain.Page;

import java.lang.reflect.Method;

public class PageConverter {

    public static <T, R> R toResponse(Page<T> page, Class<R> responseClass) {
        try {
            R response = responseClass.getDeclaredConstructor().newInstance();
            
            Method contentMethod = responseClass.getMethod("content", java.util.List.class);
            contentMethod.invoke(response, page.getContent());
            
            setFluentMethod(response, responseClass, "totalElements", page.getTotalElements());
            setFluentMethod(response, responseClass, "totalPages", page.getTotalPages());
            setFluentMethod(response, responseClass, "size", page.getSize());
            setFluentMethod(response, responseClass, "number", page.getNumber());
            setFluentMethod(response, responseClass, "numberOfElements", page.getNumberOfElements());
            setFluentMethod(response, responseClass, "first", page.isFirst());
            setFluentMethod(response, responseClass, "last", page.isLast());
            setFluentMethod(response, responseClass, "empty", page.isEmpty());
            
            return response;
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert Page to response type: " + responseClass.getName(), e);
        }
    }

    private static <R> void setFluentMethod(R response, Class<R> responseClass, String methodName, Object value) {
        try {
            Class<?> valueType = value.getClass();
            Method method = findFluentMethod(responseClass, methodName, valueType);
            
            if (method != null) {
                method.invoke(response, value);
            }
        } catch (Exception e) {
        }
    }

    private static Method findFluentMethod(Class<?> clazz, String methodName, Class<?> paramType) {
        try {
            return clazz.getMethod(methodName, paramType);
        } catch (NoSuchMethodException e) {
            for (Method method : clazz.getMethods()) {
                if (method.getName().equals(methodName) && method.getParameterCount() == 1) {
                    Class<?> methodParamType = method.getParameterTypes()[0];
                    if (isCompatibleType(paramType, methodParamType)) {
                        return method;
                    }
                }
            }
            return null;
        }
    }

    private static boolean isCompatibleType(Class<?> type1, Class<?> type2) {
        if (type1 == type2) return true;
        if (type1.isAssignableFrom(type2) || type2.isAssignableFrom(type1)) return true;
        
        return (type1 == int.class && type2 == Integer.class) ||
               (type1 == Integer.class && type2 == int.class) ||
               (type1 == long.class && type2 == Long.class) ||
               (type1 == Long.class && type2 == long.class) ||
               (type1 == boolean.class && type2 == Boolean.class) ||
               (type1 == Boolean.class && type2 == boolean.class);
    }
}

