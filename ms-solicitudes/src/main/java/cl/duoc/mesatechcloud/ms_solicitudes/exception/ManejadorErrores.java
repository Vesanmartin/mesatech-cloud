package cl.duoc.mesatechcloud.ms_solicitudes.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ManejadorErrores {

    // 400: faltan datos obligatorios
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException e) {
        Map<String, Object> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> campos.put(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("error", "Datos invalidos", "campos", campos));
    }

    // 422: la categoria aun no llego por RabbitMQ (procesamiento asincrono)
    @ExceptionHandler(CategoriaNoDisponibleException.class)
    public ResponseEntity<Map<String, Object>> categoriaNoDisponible(CategoriaNoDisponibleException e) {
        return ResponseEntity.status(422).body(Map.of("error", e.getMessage()));
    }
}
