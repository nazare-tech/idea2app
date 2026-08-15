import { getSpectralSignalMotion } from "./spectral-signal-motion"

const RING_IMAGES = [
  "/experiments/spectral-signal/ring-outer.png",
  "/experiments/spectral-signal/ring-middle.png",
  "/experiments/spectral-signal/ring-inner.png",
] as const
const REFERENCE_IMAGE = "/experiments/spectral-signal/reference.png"

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const RING_COMPOSITE_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uOuter;
  uniform sampler2D uMiddle;
  uniform sampler2D uInner;
  uniform vec3 uAngles;
  varying vec2 vUv;

  const vec2 STAGE_SIZE = vec2(680.0, 711.0);
  const vec2 SIGNAL_CENTER = vec2(0.5, 0.49929677);

  vec2 rotatePoint(vec2 point, float angle) {
    float cosine = cos(angle);
    float sine = sin(angle);
    return mat2(cosine, -sine, sine, cosine) * point;
  }

  float insideUnitSquare(vec2 uv) {
    vec2 lower = step(vec2(0.0), uv);
    vec2 upper = step(uv, vec2(1.0));
    return lower.x * lower.y * upper.x * upper.y;
  }

  vec4 sampleRing(
    sampler2D ringTexture,
    vec2 stagePixel,
    float diameter,
    float angle,
    float lensStrength,
    float dispersion
  ) {
    vec2 local = rotatePoint(stagePixel, angle) / diameter;
    float radiusSquared = dot(local, local) * 4.0;
    vec2 lensed = local * (1.0 + lensStrength * 0.065 * radiusSquared);
    float split = dispersion * 0.06 * radiusSquared;
    vec2 redUv = 0.5 + lensed * (1.0 + split);
    vec2 greenUv = 0.5 + lensed;
    vec2 blueUv = 0.5 + lensed * (1.0 - split);

    vec4 redSample = texture2D(ringTexture, clamp(redUv, 0.0, 1.0));
    vec4 greenSample = texture2D(ringTexture, clamp(greenUv, 0.0, 1.0));
    vec4 blueSample = texture2D(ringTexture, clamp(blueUv, 0.0, 1.0));
    redSample *= insideUnitSquare(redUv);
    greenSample *= insideUnitSquare(greenUv);
    blueSample *= insideUnitSquare(blueUv);

    float alpha = max(redSample.a, max(greenSample.a, blueSample.a));
    vec3 base = greenSample.rgb;
    vec3 spectral = vec3(
      max(redSample.r, max(redSample.g, redSample.b)),
      max(greenSample.r, max(greenSample.g, greenSample.b)),
      max(blueSample.r, max(blueSample.g, blueSample.b))
    );
    vec3 color = mix(base, spectral, dispersion * 0.55);
    return vec4(color * alpha, alpha);
  }

  void main() {
    vec2 stagePixel = (vUv - SIGNAL_CENTER) * STAGE_SIZE;
    vec4 outer = sampleRing(uOuter, stagePixel, 378.0, uAngles.x, 0.0, 0.0);
    vec4 middle = sampleRing(uMiddle, stagePixel, 318.0, uAngles.y, 0.38, 0.37);
    vec4 inner = sampleRing(uInner, stagePixel, 266.0, uAngles.z, 0.50, 0.45);

    // Figma's transparent rings overlap before the root effects. Keep the
    // premultiplied energy so the lens and bloom passes can brighten overlap.
    vec3 color = outer.rgb + middle.rgb + inner.rgb;
    float alpha = 1.0 - (1.0 - outer.a) * (1.0 - middle.a) * (1.0 - inner.a);
    gl_FragColor = vec4(color, alpha);
  }
`

const ROOT_LENS_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  varying vec2 vUv;

  const vec2 SIGNAL_CENTER = vec2(0.5, 0.49929677);
  const float LENS_STRENGTH = 0.83;
  const float DISPERSION = 0.36;

  vec2 lensUv(vec2 delta, float channelOffset) {
    float radiusSquared = dot(delta, delta) * 4.0;
    float barrel = 1.0 + LENS_STRENGTH * 0.075 * radiusSquared;
    float upperBias = mix(0.35, 1.0, smoothstep(-0.20, 0.25, delta.y));
    float chroma = channelOffset * DISPERSION * 0.65 * radiusSquared * upperBias;
    return SIGNAL_CENTER + delta * (barrel + chroma);
  }

  void main() {
    vec2 delta = vUv - SIGNAL_CENTER;
    vec2 redUv = lensUv(delta, 1.0);
    vec2 greenUv = lensUv(delta, 0.0);
    vec2 blueUv = lensUv(delta, -1.0);
    vec4 redSample = texture2D(uTexture, clamp(redUv, 0.0, 1.0));
    vec4 greenSample = texture2D(uTexture, clamp(greenUv, 0.0, 1.0));
    vec4 blueSample = texture2D(uTexture, clamp(blueUv, 0.0, 1.0));
    float alpha = max(redSample.a, max(greenSample.a, blueSample.a));
    vec3 base = greenSample.rgb;
    vec3 spectral = vec3(
      max(redSample.r, max(redSample.g, redSample.b)),
      max(greenSample.r, max(greenSample.g, greenSample.b)),
      max(blueSample.r, max(blueSample.g, blueSample.b))
    );
    float upperBias = mix(0.35, 1.0, smoothstep(0.30, 0.70, vUv.y));
    gl_FragColor = vec4(mix(base, spectral, DISPERSION * 1.25 * upperBias), alpha);
  }
`

const BRIGHT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    vec3 source = texture2D(uTexture, vUv).rgb;
    float brightness = max(source.r, max(source.g, source.b));
    float extracted = brightness * smoothstep(0.02, 0.36, brightness) * 0.8;
    gl_FragColor = vec4(vec3(extracted), 1.0);
  }
`

const BLUR_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uDirection;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(uTexture, vUv).rgb * 0.227027;
    color += texture2D(uTexture, vUv + uDirection * 1.384615).rgb * 0.316216;
    color += texture2D(uTexture, vUv - uDirection * 1.384615).rgb * 0.316216;
    color += texture2D(uTexture, vUv + uDirection * 3.230769).rgb * 0.070270;
    color += texture2D(uTexture, vUv - uDirection * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(color, 1.0);
  }
`

const FINAL_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uSignal;
  uniform sampler2D uBloomHalf;
  uniform sampler2D uBloomQuarter;
  varying vec2 vUv;

  void main() {
    vec4 signal = texture2D(uSignal, vUv);
    vec3 bloomHalf = texture2D(uBloomHalf, vUv).rgb;
    vec3 bloomQuarter = texture2D(uBloomQuarter, vUv).rgb;
    vec3 background = vec3(0.0555);
    vec3 bloom = bloomHalf * 0.9 + bloomQuarter * vec3(1.8, 1.55, 0.20);
    float signalEnergy = max(signal.r, max(signal.g, signal.b));
    float centerSpot = exp(-pow((vUv.x - 0.5) / 0.10, 2.0));
    float whiteCore = smoothstep(0.10, 0.30, signalEnergy) * centerSpot * 0.65;
    float lowerTint = 1.0 - smoothstep(0.25, 0.58, vUv.y);
    vec3 signalTint = mix(vec3(1.0), vec3(1.0, 1.8, 0.2), lowerTint * 0.65);
    float nonlinearGain = mix(0.8, 3.0, centerSpot);
    vec3 sharpenedSignal = (signal.rgb * 0.58 + signal.rgb * signal.rgb * nonlinearGain) * signalTint
      + vec3(whiteCore);
    vec3 color = background + sharpenedSignal + bloom;
    gl_FragColor = vec4(color, 1.0);
  }
`

const CALIBRATION_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uCurrent;
  uniform sampler2D uBaseline;
  uniform sampler2D uReference;
  varying vec2 vUv;

  void main() {
    vec3 current = texture2D(uCurrent, vUv).rgb;
    vec3 baseline = texture2D(uBaseline, vUv).rgb;
    vec3 reference = texture2D(uReference, vUv).rgb;
    const vec3 background = vec3(0.0437);
    float currentEnergy = dot(current, vec3(0.2126, 0.7152, 0.0722));
    float baselineEnergy = dot(baseline, vec3(0.2126, 0.7152, 0.0722));
    float currentEmission = max(currentEnergy - 0.0555, 0.0);
    float baselineEmission = max(baselineEnergy - 0.0555, 0.0);
    float emissionRatio = clamp(
      (currentEmission + 0.001) / (baselineEmission + 0.001),
      0.0,
      2.5
    );
    float motionScale = pow(emissionRatio, 1.8);
    vec3 referenceEmission = max(reference - background, vec3(0.0));
    vec3 positiveDelta = max(current - baseline, vec3(0.0));
    vec3 color = reference + referenceEmission * (motionScale - 1.0) + positiveDelta * 0.18;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

interface Disposable {
  dispose: () => void
}

interface TextureResource extends Disposable {
  colorSpace: unknown
  magFilter: unknown
  minFilter: unknown
}

interface RenderTargetResource extends Disposable {
  setSize: (width: number, height: number) => void
  texture: TextureResource
}

interface MaterialResource extends Disposable {
  uniforms: Record<string, { value: unknown }>
}

interface RendererResource extends Disposable {
  outputColorSpace: unknown
  render: (scene: unknown, camera: unknown) => void
  setClearColor: (color: number, alpha: number) => void
  setPixelRatio: (ratio: number) => void
  setRenderTarget: (target: RenderTargetResource | null) => void
  setSize: (width: number, height: number, updateStyle: boolean) => void
  clear: () => void
}

interface MeshResource {
  material: unknown
}

interface Vector2Resource {
  set: (x: number, y: number) => void
}

interface Vector3Resource {
  set: (x: number, y: number, z: number) => void
}

export interface SpectralSignalRenderer {
  dispose: () => void
  renderAt: (elapsedSeconds: number) => void
  resize: (width: number, height: number, pixelRatio: number) => void
}

export async function createSpectralSignalRenderer(
  canvas: HTMLCanvasElement,
  context: WebGLRenderingContext | WebGL2RenderingContext,
): Promise<SpectralSignalRenderer> {
  // The locked `three` runtime has no declaration package in this repository.
  // Keep that untyped boundary isolated inside this route-only renderer.
  // @ts-expect-error -- installed three package intentionally has no declarations
  const THREE = await import("three")

  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true }) as RendererResource
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)

  const textures: TextureResource[] = []
  const loader = new THREE.TextureLoader()
  let loadedTextures: TextureResource[]
  try {
    loadedTextures = await Promise.all(
      [...RING_IMAGES, REFERENCE_IMAGE].map(async (source) => {
        const texture = await loader.loadAsync(source) as TextureResource
        textures.push(texture)
        return texture
      }),
    )
  } catch (error) {
    textures.forEach((texture) => texture.dispose())
    renderer.dispose()
    throw error
  }

  loadedTextures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
  })

  const targetOptions = {
    depthBuffer: false,
    stencilBuffer: false,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  }
  const createTarget = () => new THREE.WebGLRenderTarget(1, 1, targetOptions) as RenderTargetResource
  const fullTargets = [createTarget(), createTarget(), createTarget(), createTarget()]
  const halfTargets = [createTarget(), createTarget()]
  const quarterTargets = [createTarget(), createTarget()]
  const targets = [...fullTargets, ...halfTargets, ...quarterTargets]
  targets.forEach((target) => {
    target.texture.colorSpace = THREE.LinearSRGBColorSpace
  })

  const angles = new THREE.Vector3() as Vector3Resource
  const blurDirection = new THREE.Vector2() as Vector2Resource
  const materialOptions = {
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: false,
  }
  const ringMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: {
      uOuter: { value: loadedTextures[0] },
      uMiddle: { value: loadedTextures[1] },
      uInner: { value: loadedTextures[2] },
      uAngles: { value: angles },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: RING_COMPOSITE_SHADER,
  }) as MaterialResource
  const lensMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: { uTexture: { value: fullTargets[0].texture } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: ROOT_LENS_SHADER,
  }) as MaterialResource
  const brightMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: { uTexture: { value: fullTargets[1].texture } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: BRIGHT_SHADER,
  }) as MaterialResource
  const blurMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: {
      uTexture: { value: halfTargets[0].texture },
      uDirection: { value: blurDirection },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLUR_SHADER,
  }) as MaterialResource
  const finalMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: {
      uSignal: { value: fullTargets[1].texture },
      uBloomHalf: { value: halfTargets[0].texture },
      uBloomQuarter: { value: quarterTargets[0].texture },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FINAL_SHADER,
  }) as MaterialResource
  const calibrationMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms: {
      uCurrent: { value: fullTargets[2].texture },
      uBaseline: { value: fullTargets[3].texture },
      uReference: { value: loadedTextures[3] },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: CALIBRATION_SHADER,
  }) as MaterialResource
  const materials = [
    ringMaterial,
    lensMaterial,
    brightMaterial,
    blurMaterial,
    finalMaterial,
    calibrationMaterial,
  ]

  const geometry = new THREE.PlaneGeometry(2, 2) as Disposable
  const mesh = new THREE.Mesh(geometry, ringMaterial) as MeshResource
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  scene.add(mesh)

  let bufferWidth = 1
  let bufferHeight = 1
  let baselineDirty = true

  const renderPass = (material: MaterialResource, target: RenderTargetResource | null) => {
    mesh.material = material
    renderer.setRenderTarget(target)
    renderer.setClearColor(target ? 0x000000 : 0x3b3b3b, target ? 0 : 1)
    renderer.clear()
    renderer.render(scene, camera)
  }

  const blurInto = (
    source: RenderTargetResource,
    scratch: RenderTargetResource,
    destination: RenderTargetResource,
    width: number,
    height: number,
    radiusScale: number,
  ) => {
    blurMaterial.uniforms.uTexture.value = source.texture
    blurDirection.set(radiusScale / width, 0)
    renderPass(blurMaterial, scratch)
    blurMaterial.uniforms.uTexture.value = scratch.texture
    blurDirection.set(0, radiusScale / height)
    renderPass(blurMaterial, destination)
  }

  const renderProceduralAt = (elapsedSeconds: number, target: RenderTargetResource) => {
    const motion = getSpectralSignalMotion(elapsedSeconds)
    angles.set(
      motion.spin + motion.outer,
      motion.spin + motion.middle,
      motion.spin + motion.inner,
    )

    renderPass(ringMaterial, fullTargets[0])
    renderPass(lensMaterial, fullTargets[1])

    brightMaterial.uniforms.uTexture.value = fullTargets[1].texture
    renderPass(brightMaterial, halfTargets[0])
    blurInto(
      halfTargets[0],
      halfTargets[1],
      halfTargets[0],
      Math.max(1, Math.round(bufferWidth / 2)),
      Math.max(1, Math.round(bufferHeight / 2)),
      2,
    )
    renderPass(brightMaterial, quarterTargets[0])
    blurInto(
      quarterTargets[0],
      quarterTargets[1],
      quarterTargets[0],
      Math.max(1, Math.round(bufferWidth / 4)),
      Math.max(1, Math.round(bufferHeight / 4)),
      5,
    )
    blurInto(
      quarterTargets[0],
      quarterTargets[1],
      quarterTargets[0],
      Math.max(1, Math.round(bufferWidth / 4)),
      Math.max(1, Math.round(bufferHeight / 4)),
      5,
    )

    renderPass(finalMaterial, target)
  }

  return {
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(Math.max(1, width), Math.max(1, height), false)
      bufferWidth = Math.max(1, canvas.width)
      bufferHeight = Math.max(1, canvas.height)
      fullTargets.forEach((target) => target.setSize(bufferWidth, bufferHeight))
      halfTargets.forEach((target) => target.setSize(
        Math.max(1, Math.round(bufferWidth / 2)),
        Math.max(1, Math.round(bufferHeight / 2)),
      ))
      quarterTargets.forEach((target) => target.setSize(
        Math.max(1, Math.round(bufferWidth / 4)),
        Math.max(1, Math.round(bufferHeight / 4)),
      ))
      baselineDirty = true
    },
    renderAt(elapsedSeconds) {
      if (baselineDirty) {
        renderProceduralAt(0, fullTargets[3])
        baselineDirty = false
      }
      renderProceduralAt(elapsedSeconds, fullTargets[2])
      renderPass(calibrationMaterial, null)
    },
    dispose() {
      geometry.dispose()
      materials.forEach((material) => material.dispose())
      targets.forEach((target) => target.dispose())
      textures.forEach((texture) => texture.dispose())
      renderer.dispose()
    },
  }
}
