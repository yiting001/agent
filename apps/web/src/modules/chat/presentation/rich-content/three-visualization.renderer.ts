import type { BufferGeometry, Scene } from 'three';

import type {
  ThreeObjectSpecification,
  ThreeSceneSpecification,
} from './visualization-specification';
import { parseThreeScene } from './visualization-specification';

interface DisposableResource {
  dispose(): void;
}

interface ThreeDisposalResources {
  animationFrame: number;
  controls: DisposableResource;
  disposables: DisposableResource[];
  observer: { disconnect(): void };
  renderer: DisposableResource & {
    domElement: HTMLElement;
    forceContextLoss(): void;
  };
  scene: { clear(): void };
}

type ThreeModule = typeof import('three');

function createGeometry(
  three: ThreeModule,
  object: ThreeObjectSpecification,
): BufferGeometry {
  switch (object.type) {
    case 'box':
      return new three.BoxGeometry(...object.size);
    case 'cone':
      return new three.ConeGeometry(object.radius, object.height, 32);
    case 'cylinder':
      return new three.CylinderGeometry(
        object.radius,
        object.radius,
        object.height,
        32,
      );
    case 'plane':
      return new three.PlaneGeometry(...object.size);
    case 'sphere':
      return new three.SphereGeometry(object.radius, 32, 20);
    case 'torus':
      return new three.TorusGeometry(object.radius, object.tube, 20, 64);
  }
}

function addObjects(
  three: ThreeModule,
  scene: Scene,
  specification: ThreeSceneSpecification,
  disposables: DisposableResource[],
): void {
  for (const object of specification.objects) {
    const geometry = createGeometry(three, object);
    const material = new three.MeshStandardMaterial({
      color: object.color,
      metalness: 0.12,
      roughness: 0.55,
      side: three.DoubleSide,
    });
    const mesh = new three.Mesh(geometry, material);

    mesh.position.set(...object.position);
    mesh.rotation.set(...object.rotation);
    scene.add(mesh);
    disposables.push(geometry, material);
  }
}

/** 销毁动画、观察器、控制器、GPU 几何体和 WebGL 上下文。 */
export function disposeThreeResources(resources: ThreeDisposalResources): void {
  window.cancelAnimationFrame(resources.animationFrame);
  resources.observer.disconnect();
  resources.controls.dispose();

  for (const disposable of resources.disposables) {
    disposable.dispose();
  }

  resources.scene.clear();
  resources.renderer.dispose();
  resources.renderer.forceContextLoss();
  resources.renderer.domElement.remove();
}

/** 使用结构化场景描述渲染 Three.js；模型输出永远不会作为 JavaScript 执行。 */
export async function renderThreeVisualization(
  element: HTMLElement,
  source: string,
): Promise<() => void> {
  const specification = parseThreeScene(source);
  const [three, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
  ]);
  const width = Math.max(element.clientWidth, 320);
  const height = 360;
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(45, width / height, 0.1, 1_000);
  const renderer = new three.WebGLRenderer({ antialias: true });
  const controls = new OrbitControls(camera, renderer.domElement);
  const disposables: DisposableResource[] = [];

  scene.background = new three.Color(specification.background);
  camera.position.set(...specification.camera.position);
  controls.target.set(...specification.camera.target);
  controls.enableDamping = true;
  controls.autoRotate = specification.autoRotate;
  controls.autoRotateSpeed = 1.2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.domElement.className = 'rich-visualization__canvas';
  element.replaceChildren(renderer.domElement);

  scene.add(new three.AmbientLight(0xffffff, 1.5));
  const directionalLight = new three.DirectionalLight(0xffffff, 2.5);

  directionalLight.position.set(5, 8, 6);
  scene.add(directionalLight);
  addObjects(three, scene, specification, disposables);

  const observer = new ResizeObserver(() => {
    const nextWidth = Math.max(element.clientWidth, 320);

    camera.aspect = nextWidth / height;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, height);
  });

  observer.observe(element);
  let animationFrame = 0;
  const animate = (): void => {
    controls.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };

  animate();

  return () =>
    disposeThreeResources({
      animationFrame,
      controls,
      disposables,
      observer,
      renderer,
      scene,
    });
}
