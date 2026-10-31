package cl.duoc.mesatechcloud.ms_catalogo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ManejadorErrores {

    // 400: datos invalidos (no se guarda nada)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException e) {
        Map<String, Object> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> campos.put(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("error", "Datos invalidos", "campos", campos));
    }

    // 503 (prueba P7): se informa honestamente que la categoria SI quedo guardada, pero sin evento
    @ExceptionHandler(PublicacionFallidaException.class)
    public ResponseEntity<Map<String, Object>> publicacion(PublicacionFallidaException e) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "La categoria se guardo en Catalogo, pero no se pudo confirmar la publicacion del evento");
        body.put("categoriaGuardada", true);
        body.put("eventoPublicado", false);
        body.put("categoriaId", e.getCategoria().getId());
        body.put("nombre", e.getCategoria().getNombre());
        body.put("eventId", e.getEventId());
        body.put("detalle", "Solicitudes no recibira esta categoria mientras no se vuelva a publicar el evento");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
