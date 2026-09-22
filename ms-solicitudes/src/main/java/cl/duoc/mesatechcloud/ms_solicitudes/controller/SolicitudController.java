package cl.duoc.mesatechcloud.ms_solicitudes.controller;

import cl.duoc.mesatechcloud.ms_solicitudes.exception.TransicionEstadoInvalidaException;
import cl.duoc.mesatechcloud.ms_solicitudes.model.Estado;
import cl.duoc.mesatechcloud.ms_solicitudes.model.Solicitud;
import cl.duoc.mesatechcloud.ms_solicitudes.service.SolicitudService;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/solicitudes")
public class SolicitudController {

    private final SolicitudService solicitudService;

    public SolicitudController(SolicitudService solicitudService) {
        this.solicitudService = solicitudService;
    }

    @PostMapping
    public ResponseEntity<Solicitud> crear(@Valid @RequestBody Solicitud solicitud) {
        return ResponseEntity.ok(solicitudService.crear(solicitud));
    }

    @GetMapping("/mias")
    public ResponseEntity<List<Solicitud>> listarMias(@RequestParam String usuarioId) {
        return ResponseEntity.ok(solicitudService.listarPorUsuario(usuarioId));
    }

    @GetMapping
    public ResponseEntity<List<Solicitud>> listarTodas() {
        return ResponseEntity.ok(solicitudService.listarTodas());
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Solicitud> cambiarEstado(@PathVariable Long id, @RequestParam Estado nuevoEstado) {
        return ResponseEntity.ok(solicitudService.cambiarEstado(id, nuevoEstado));
    }

    @ExceptionHandler(TransicionEstadoInvalidaException.class)
    public ResponseEntity<String> manejarTransicionInvalida(TransicionEstadoInvalidaException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}



