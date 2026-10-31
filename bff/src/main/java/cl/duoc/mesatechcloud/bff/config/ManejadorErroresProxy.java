package cl.duoc.mesatechcloud.bff.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

import java.util.Map;

/**
 * EP2: el BFF reenvia al frontend el codigo y el cuerpo de error que responde el microservicio,
 * en vez de convertir todo en un 500 generico. Asi React puede mostrar, por ejemplo:
 * - 503 de Catalogo cuando la categoria se guardo pero el evento no se publico (P7)
 * - 422 de Solicitudes cuando la categoria aun no llega por RabbitMQ
 */
@RestControllerAdvice
public class ManejadorErroresProxy {

    @ExceptionHandler(HttpStatusCodeException.class)
    public ResponseEntity<String> errorDelMicroservicio(HttpStatusCodeException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(ex.getResponseBodyAsString());
    }

    // El microservicio no responde (detenido o sin red)
    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Map<String, String>> microservicioNoDisponible(ResourceAccessException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "El microservicio no esta disponible en este momento"));
    }
}
