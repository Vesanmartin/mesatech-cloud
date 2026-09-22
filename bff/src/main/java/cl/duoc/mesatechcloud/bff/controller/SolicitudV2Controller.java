package cl.duoc.mesatechcloud.bff.controller;

import cl.duoc.mesatechcloud.bff.dto.SolicitudDTO;
import cl.duoc.mesatechcloud.bff.dto.SolicitudV2Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v2/solicitudes")
public class SolicitudV2Controller {

    private final RestTemplate restTemplate;

    @Value("${ms.solicitudes.url}")
    private String msSolicitudesUrl;

    public SolicitudV2Controller(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public ResponseEntity<List<SolicitudV2Response>> listarTodas() {
        ResponseEntity<List<SolicitudDTO>> response = restTemplate.exchange(
                msSolicitudesUrl + "/v1/solicitudes",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<SolicitudDTO>>() {}
        );

        List<SolicitudV2Response> resultado = response.getBody().stream()
                .map(SolicitudV2Response::desde)
                .collect(Collectors.toList());

        return ResponseEntity.ok(resultado);
    }
}