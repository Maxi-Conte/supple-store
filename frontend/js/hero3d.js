import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";


const contenedor =
  document.getElementById(
    "heroProducto3D"
  );


if (contenedor) {
  iniciarPote3D();
}


function iniciarPote3D() {

  /* =========================================
     ESCENA Y CÁMARA
  ========================================= */

  const escena =
    new THREE.Scene();


  const camara =
    new THREE.PerspectiveCamera(
      34,
      1,
      0.1,
      100
    );


  camara.position.set(
    0,
    0.1,
    7.9
  );


  /* =========================================
     RENDERIZADOR
  ========================================= */

  const renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );


  renderer.setClearColor(
    0x000000,
    0
  );


  renderer.outputColorSpace =
    THREE.SRGBColorSpace;


  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;


  renderer.toneMappingExposure =
    1.15;


  renderer.shadowMap.enabled =
    true;


  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;


  contenedor.appendChild(
    renderer.domElement
  );


  renderer.domElement.style.touchAction =
    "none";


  /* =========================================
     ILUMINACIÓN
  ========================================= */

  const luzAmbiente =
    new THREE.HemisphereLight(
      0xffffff,
      0x090a0d,
      2.2
    );


  escena.add(
    luzAmbiente
  );


  const luzPrincipal =
    new THREE.DirectionalLight(
      0xffffff,
      5.2
    );


  luzPrincipal.position.set(
    4.5,
    5.5,
    5.5
  );


  luzPrincipal.castShadow =
    true;


  escena.add(
    luzPrincipal
  );


  const luzDorada =
    new THREE.DirectionalLight(
      0xf3cf78,
      3.1
    );


  luzDorada.position.set(
    -4.5,
    1.5,
    4.5
  );


  escena.add(
    luzDorada
  );


  const luzTrasera =
    new THREE.DirectionalLight(
      0xffffff,
      2.2
    );


  luzTrasera.position.set(
    2.5,
    3.5,
    -4.5
  );


  escena.add(
    luzTrasera
  );


  const luzFrontal =
    new THREE.PointLight(
      0xffe4a3,
      1.6,
      12
    );


  luzFrontal.position.set(
    0,
    0.3,
    4.5
  );


  escena.add(
    luzFrontal
  );


  /* =========================================
     GRUPO PRINCIPAL DEL POTE
  ========================================= */

  const pote =
    new THREE.Group();

  const posicionBasePoteY =
    -0.15;

  pote.rotation.x =
    -0.07;


  pote.rotation.y =
    -0.15;


  pote.rotation.z =
    -0.025;


  escena.add(
    pote
  );

  /* Más alto y ligeramente más angosto */

  pote.scale.set(
    /*Ancho*/ 0.96,
    /*Altura*/ 1.16,
    /*Profundidad*/ 0.96
  );


  /* =========================================
     MATERIALES DEL ENVASE
  ========================================= */

  const materialCuerpo =
    new THREE.MeshPhysicalMaterial({

      color: 0x08090c,

      roughness: 0.25,

      metalness: 0.1,

      clearcoat: 1,

      clearcoatRoughness: 0.1,

      reflectivity: 0.95

    });


  const materialTapa =
    new THREE.MeshPhysicalMaterial({

      color: 0x101114,

      roughness: 0.32,

      metalness: 0.2,

      clearcoat: 1,

      clearcoatRoughness: 0.12

    });


  const materialAro =
    new THREE.MeshPhysicalMaterial({

      color: 0x25272c,

      roughness: 0.22,

      metalness: 0.45,

      clearcoat: 0.85

    });


  const materialDorado =
    new THREE.MeshPhysicalMaterial({

      color: 0xd8ad4e,

      roughness: 0.22,

      metalness: 0.75,

      clearcoat: 0.8,

      clearcoatRoughness: 0.12

    });


  /* =========================================
     CUERPO DEL POTE
  ========================================= */

  const perfilCuerpo = [

    new THREE.Vector2(
      0,
      -1.42
    ),

    new THREE.Vector2(
      1.12,
      -1.42
    ),

    new THREE.Vector2(
      1.23,
      -1.37
    ),

    new THREE.Vector2(
      1.3,
      -1.27
    ),

    new THREE.Vector2(
      1.33,
      -1.1
    ),

    new THREE.Vector2(
      1.33,
      0.92
    ),

    new THREE.Vector2(
      1.29,
      1.08
    ),

    new THREE.Vector2(
      1.2,
      1.21
    ),

    new THREE.Vector2(
      1.08,
      1.32
    ),

    new THREE.Vector2(
      0,
      1.32
    )

  ];


  const geometriaCuerpo =
    new THREE.LatheGeometry(
      perfilCuerpo,
      128
    );


  const cuerpo =
    new THREE.Mesh(
      geometriaCuerpo,
      materialCuerpo
    );


  cuerpo.castShadow =
    true;


  cuerpo.receiveShadow =
    true;


  pote.add(
    cuerpo
  );


  /* =========================================
     CUELLO DEL ENVASE
  ========================================= */

  const cuello =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        1.03,
        1.08,
        0.2,
        96
      ),

      materialCuerpo

    );


  cuello.position.y =
    1.4;


  cuello.castShadow =
    true;


  pote.add(
    cuello
  );


  /* =========================================
     CARGAR ETIQUETA DESDE LA IMAGEN
  ========================================= */

  const cargadorTexturas =
    new THREE.TextureLoader();


  const texturaEtiqueta =
    cargadorTexturas.load(

      "/img/whey-etiqueta.png",

      () => {

        console.log(
          "Textura de la etiqueta cargada."
        );

      },

      undefined,

      error => {

        console.error(
          "No se pudo cargar whey-etiqueta.png:",
          error
        );

      }

    );


  texturaEtiqueta.colorSpace =
    THREE.SRGBColorSpace;


  texturaEtiqueta.anisotropy =
    renderer.capabilities
      .getMaxAnisotropy();


  /*
    Se invierte horizontalmente para evitar que
    el texto quede espejado sobre el cilindro.
  */

  texturaEtiqueta.wrapS = THREE.ClampToEdgeWrapping;
  texturaEtiqueta.repeat.x = 1;
  texturaEtiqueta.offset.x = 0;


  texturaEtiqueta.wrapT =
    THREE.ClampToEdgeWrapping;


  texturaEtiqueta.minFilter =
    THREE.LinearMipmapLinearFilter;


  texturaEtiqueta.magFilter =
    THREE.LinearFilter;


  /* =========================================
     ETIQUETA CURVA FRONTAL
  ========================================= */

  /*
    La imagen generada representa el frente de
    la etiqueta, no el envoltorio completo de 360°.

    Por eso usamos una sección curva frontal.
    Así no se estira alrededor de todo el pote.
  */

  const anguloEtiqueta =
    2.05;


  const geometriaEtiqueta =
    new THREE.CylinderGeometry(

      1.347,
      1.347,

      1.78,

      128,
      1,

      true,

      -anguloEtiqueta / 2,
      anguloEtiqueta

    );


  const materialEtiqueta =
    new THREE.MeshPhysicalMaterial({

      map: texturaEtiqueta,

      roughness: 0.3,

      metalness: 0.14,

      clearcoat: 0.75,

      clearcoatRoughness: 0.1,

      side: THREE.DoubleSide

    });


  const etiqueta =
    new THREE.Mesh(
      geometriaEtiqueta,
      materialEtiqueta
    );


  etiqueta.position.y =
    -0.08;


  etiqueta.castShadow =
    true;


  pote.add(
    etiqueta
  );

  /* =========================================
   ETIQUETA TRASERA
========================================= */

  const etiquetaTrasera =
    etiqueta.clone();

  etiquetaTrasera.rotation.y =
    Math.PI;

  pote.add(
    etiquetaTrasera
  );


  /* =========================================
     BORDES DORADOS DE LA ETIQUETA
  ========================================= */

  const bordeEtiquetaSuperior =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        1.347,
        0.027,
        16,
        128,
        anguloEtiqueta
      ),

      materialDorado

    );


  bordeEtiquetaSuperior.rotation.x =
    Math.PI / 2;


  bordeEtiquetaSuperior.rotation.z =
    -anguloEtiqueta / 2;


  bordeEtiquetaSuperior.position.y =
    0.81;


  pote.add(
    bordeEtiquetaSuperior
  );

  const bordeSuperiorTrasero =
    bordeEtiquetaSuperior.clone();

  bordeSuperiorTrasero.rotation.y =
    Math.PI;

  pote.add(
    bordeSuperiorTrasero
  );


  const bordeEtiquetaInferior =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        1.347,
        0.027,
        16,
        128,
        anguloEtiqueta
      ),

      materialDorado

    );


  bordeEtiquetaInferior.rotation.x =
    Math.PI / 2;


  bordeEtiquetaInferior.rotation.z =
    -anguloEtiqueta / 2;


  bordeEtiquetaInferior.position.y =
    -0.97;


  pote.add(
    bordeEtiquetaInferior
  );

  const bordeInferiorTrasero =
    bordeEtiquetaInferior.clone();

  bordeInferiorTrasero.rotation.y =
    Math.PI;

  pote.add(
    bordeInferiorTrasero
  );


  /* =========================================
     TAPA
  ========================================= */

  const tapa =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        1.12,
        1.12,
        0.46,
        128
      ),

      materialTapa

    );


  tapa.position.y =
    1.68;


  tapa.castShadow =
    true;


  pote.add(
    tapa
  );


  const discoTapa =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        1.04,
        1.04,
        0.035,
        128
      ),

      new THREE.MeshPhysicalMaterial({

        color: 0x17191d,

        roughness: 0.25,

        metalness: 0.22,

        clearcoat: 1

      })

    );


  discoTapa.position.y =
    1.925;


  pote.add(
    discoTapa
  );


  /* =========================================
     RANURAS DE LA TAPA
  ========================================= */

  const materialRanuras =
    new THREE.MeshStandardMaterial({

      color: 0x2a2c31,

      roughness: 0.5

    });


  const geometriaRanura =
    new THREE.BoxGeometry(
      0.038,
      0.33,
      0.105
    );


  const cantidadRanuras =
    56;


  const radioRanuras =
    1.135;


  for (
    let indice = 0;
    indice < cantidadRanuras;
    indice++
  ) {

    const angulo =
      (
        indice /
        cantidadRanuras
      ) *
      Math.PI *
      2;


    const ranura =
      new THREE.Mesh(
        geometriaRanura,
        materialRanuras
      );


    ranura.position.set(

      Math.cos(
        angulo
      ) * radioRanuras,

      1.68,

      Math.sin(
        angulo
      ) * radioRanuras

    );


    ranura.rotation.y =
      -angulo;


    pote.add(
      ranura
    );

  }


  /* =========================================
     AROS DEL ENVASE
  ========================================= */

  const aroSuperior =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        1.08,
        0.045,
        20,
        128
      ),

      materialAro

    );


  aroSuperior.rotation.x =
    Math.PI / 2;


  aroSuperior.position.y =
    1.43;


  pote.add(
    aroSuperior
  );


  const aroInferior =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        1.25,
        0.05,
        20,
        128
      ),

      materialAro

    );


  aroInferior.rotation.x =
    Math.PI / 2;


  aroInferior.position.y =
    -1.34;


  pote.add(
    aroInferior
  );


  /* =========================================
     SOMBRA
  ========================================= */

  const planoSombra =
    new THREE.Mesh(

      new THREE.CircleGeometry(
        1.55,
        96
      ),

      new THREE.ShadowMaterial({

        color: 0x000000,

        opacity: 0.38

      })

    );


  planoSombra.rotation.x =
    -Math.PI / 2;


  planoSombra.position.y =
    -1.48;


  planoSombra.receiveShadow =
    true;


  escena.add(
    planoSombra
  );


  /* =========================================
     INTERACCIÓN CON MOUSE O DEDO
  ========================================= */

  let arrastrando =
    false;


  let posicionAnteriorX =
    0;


  renderer.domElement.addEventListener(
    "pointerdown",
    evento => {

      arrastrando =
        true;


      posicionAnteriorX =
        evento.clientX;


      renderer.domElement
        .setPointerCapture(
          evento.pointerId
        );

    }
  );


  renderer.domElement.addEventListener(
    "pointermove",
    evento => {

      if (!arrastrando) {
        return;
      }


      const movimientoX =
        evento.clientX -
        posicionAnteriorX;


      pote.rotation.y +=
        movimientoX * 0.01;


      posicionAnteriorX =
        evento.clientX;

    }
  );


  function terminarArrastre(
    evento
  ) {

    arrastrando =
      false;


    if (
      renderer.domElement
        .hasPointerCapture(
          evento.pointerId
        )
    ) {

      renderer.domElement
        .releasePointerCapture(
          evento.pointerId
        );

    }

  }


  renderer.domElement.addEventListener(
    "pointerup",
    terminarArrastre
  );


  renderer.domElement.addEventListener(
    "pointercancel",
    () => {

      arrastrando =
        false;

    }
  );


  /* =========================================
     RESPONSIVE
  ========================================= */

  function ajustarTamaño() {

    const ancho =
      contenedor.clientWidth;


    const alto =
      contenedor.clientHeight;


    if (
      ancho <= 0 ||
      alto <= 0
    ) {
      return;
    }


    renderer.setSize(
      ancho,
      alto,
      false
    );


    camara.aspect =
      ancho / alto;


    camara.updateProjectionMatrix();

  }


  const observador =
    new ResizeObserver(
      ajustarTamaño
    );


  observador.observe(
    contenedor
  );


  ajustarTamaño();


  /* =========================================
     ANIMACIÓN
  ========================================= */

  const reducirMovimiento =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  function animar(
    tiempo
  ) {

    if (
      !arrastrando &&
      !reducirMovimiento
    ) {

      pote.rotation.y +=
        0.0045;

    }


    if (!reducirMovimiento) {

      pote.position.y =
        posicionBasePoteY +
        Math.sin(
          tiempo * 0.00145
        ) * 0.045;

    }


    renderer.render(
      escena,
      camara
    );

  }


  renderer.setAnimationLoop(
    animar
  );

}