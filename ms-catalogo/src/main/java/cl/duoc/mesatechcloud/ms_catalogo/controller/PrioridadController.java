package cl.duoc.mesatechcloud.ms_catalogo.controller;

import cl.duoc.mesatechcloud.ms_catalogo.model.Prioridad;
import cl.duoc.mesatechcloud.ms_catalogo.service.PrioridadService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/prioridades")
public class PrioridadController {

    private final PrioridadService prioridadService;

    public PrioridadController(PrioridadService prioridadService) {
        this.prioridadService = prioridadService;
    }

    @GetMapping
    public List<Prioridad> listar() {
        return prioridadService.listar();
    }

    @PostMapping
    public Prioridad crear(@Valid @RequestBody Prioridad prioridad) {
        return prioridadService.crear(prioridad);
    }

    @PutMapping("/{id}")
    public Prioridad actualizar(@PathVariable Long id, @Valid @RequestBody Prioridad prioridad) {
        return prioridadService.actualizar(id, prioridad);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        prioridadService.eliminar(id);
    }
}