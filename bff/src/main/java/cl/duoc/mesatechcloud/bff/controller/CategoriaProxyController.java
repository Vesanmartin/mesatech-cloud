package cl.duoc.mesatechcloud.bff.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/v1/categorias")
public class CategoriaProxyController {

    private final RestTemplate restTemplate;

    @Value("${ms.catalogo.url}")
    private String msCatalogoUrl;

    public CategoriaProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public ResponseEntity<Object> listar() {
        return restTemplate.getForEntity(msCatalogoUrl + "/v1/categorias", Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PostMapping
    public ResponseEntity<Object> crear(@RequestBody Object categoria) {
        return restTemplate.postForEntity(msCatalogoUrl + "/v1/categorias", categoria, Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizar(@PathVariable Long id, @RequestBody Object categoria) {
        HttpEntity<Object> request = new HttpEntity<>(categoria);
        return restTemplate.exchange(msCatalogoUrl + "/v1/categorias/" + id, HttpMethod.PUT, request, Object.class);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        restTemplate.delete(msCatalogoUrl + "/v1/categorias/" + id);
        return ResponseEntity.noContent().build();
    }
}