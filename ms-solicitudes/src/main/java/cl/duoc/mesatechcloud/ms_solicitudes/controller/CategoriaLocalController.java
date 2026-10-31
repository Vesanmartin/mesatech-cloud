package cl.duoc.mesatechcloud.ms_solicitudes.controller;

import cl.duoc.mesatechcloud.ms_solicitudes.model.CategoriaLocal;
import cl.duoc.mesatechcloud.ms_solicitudes.service.CategoriaLocalService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** EP2: categorias DISPONIBLES para crear solicitudes (copia local recibida por RabbitMQ). */
@RestController
@RequestMapping("/v1/categorias-disponibles")
public class CategoriaLocalController {

    private final CategoriaLocalService service;

    public CategoriaLocalController(CategoriaLocalService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoriaLocal> listar() {
        return service.listar();
    }
}
