const MAX_ARRAY_ITEMS = 500;
const MAX_JSON_DEPTH = 12;
const MAX_JSON_NODES = 2_000;
const MAX_SOURCE_LENGTH = 100_000;
const MAX_THREE_OBJECTS = 40;
const COLOR_PATTERN = /^#[\da-f]{6}$/i;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EXTERNAL_RESOURCE_PATTERN =
  /(?:^|[\s"'(])(data:|https?:|javascript:|\/\/)/i;

export interface D3Datum {
  name: string;
  value: number;
}

export interface D3Specification {
  data: D3Datum[];
  type: 'bar' | 'line';
}

export type ThreeObjectSpecification =
  | {
      color: string;
      position: Vector3;
      rotation: Vector3;
      size: Vector3;
      type: 'box';
    }
  | {
      color: string;
      position: Vector3;
      radius: number;
      rotation: Vector3;
      type: 'sphere';
    }
  | {
      color: string;
      height: number;
      position: Vector3;
      radius: number;
      rotation: Vector3;
      type: 'cone' | 'cylinder';
    }
  | {
      color: string;
      position: Vector3;
      radius: number;
      rotation: Vector3;
      tube: number;
      type: 'torus';
    }
  | {
      color: string;
      position: Vector3;
      rotation: Vector3;
      size: [number, number];
      type: 'plane';
    };

type Vector3 = [number, number, number];

export interface ThreeSceneSpecification {
  autoRotate: boolean;
  background: string;
  camera: {
    position: Vector3;
    target: Vector3;
  };
  objects: ThreeObjectSpecification[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(
  value: unknown,
  context: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${context} 必须是 JSON 对象。`);
  }

  return value;
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: string[],
  context: string,
): void {
  const allowedKeys = new Set(allowed);
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));

  if (unknownKey) {
    throw new Error(`${context} 不支持属性 ${unknownKey}。`);
  }
}

function numberInRange(
  value: unknown,
  context: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${context} 必须是 ${minimum} 到 ${maximum} 之间的数字。`);
  }

  return value;
}

function readColor(value: unknown, fallback: string, context: string): string {
  const color = value === undefined ? fallback : value;

  if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) {
    throw new Error(`${context} 必须是六位十六进制颜色。`);
  }

  return color;
}

function readVector3(
  value: unknown,
  fallback: Vector3,
  context: string,
  minimum: number,
  maximum: number,
): Vector3 {
  const vector = value === undefined ? fallback : value;

  if (!Array.isArray(vector) || vector.length !== 3) {
    throw new Error(`${context} 必须包含三个数字。`);
  }

  return [
    numberInRange(vector[0], `${context}[0]`, minimum, maximum),
    numberInRange(vector[1], `${context}[1]`, minimum, maximum),
    numberInRange(vector[2], `${context}[2]`, minimum, maximum),
  ];
}

/**
 * 对模型提供的 JSON 做通用安全遍历，限制深度、节点数、危险键和外部资源。
 */
function assertSafeStructuredData(value: unknown): void {
  let nodes = 0;

  function visit(current: unknown, depth: number): void {
    nodes += 1;

    if (nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      throw new Error('可视化 JSON 过于复杂。');
    }

    if (typeof current === 'string') {
      if (current.length > 20_000) {
        throw new Error('可视化文本字段过长。');
      }

      if (EXTERNAL_RESOURCE_PATTERN.test(current)) {
        throw new Error('可视化 JSON 不允许外链资源或脚本 URL。');
      }

      return;
    }

    if (Array.isArray(current)) {
      if (current.length > MAX_ARRAY_ITEMS) {
        throw new Error('可视化数组项目过多。');
      }

      for (const item of current) {
        visit(item, depth + 1);
      }

      return;
    }

    if (!isRecord(current)) {
      return;
    }

    for (const [key, item] of Object.entries(current)) {
      if (DANGEROUS_KEYS.has(key)) {
        throw new Error(`可视化 JSON 不允许属性 ${key}。`);
      }

      visit(item, depth + 1);
    }
  }

  visit(value, 0);
}

/** 解析声明式 JSON；任何模型生成的 JavaScript 都不会进入执行链路。 */
export function parseSafeVisualizationJson(source: string): unknown {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error('可视化源码过长。');
  }

  const parsed: unknown = JSON.parse(source);

  assertSafeStructuredData(parsed);
  return parsed;
}

/** ECharts 仅接收经过通用安全遍历的 JSON 对象配置。 */
export function parseEChartsOption(source: string): Record<string, unknown> {
  return assertRecord(parseSafeVisualizationJson(source), 'ECharts 配置');
}

/** D3 只支持固定的柱状图和折线图数据协议，不执行模型脚本。 */
export function parseD3Specification(source: string): D3Specification {
  const record = assertRecord(parseSafeVisualizationJson(source), 'D3 配置');

  assertAllowedKeys(record, ['data', 'type'], 'D3 配置');

  if (record.type !== 'bar' && record.type !== 'line') {
    throw new Error('D3 仅支持 bar 或 line。');
  }

  if (!Array.isArray(record.data) || record.data.length === 0) {
    throw new Error('D3 data 必须是非空数组。');
  }

  const data = record.data.map((item, index) => {
    const datum = assertRecord(item, `D3 data[${index}]`);

    assertAllowedKeys(datum, ['name', 'value'], `D3 data[${index}]`);

    if (
      typeof datum.name !== 'string' ||
      !datum.name.trim() ||
      datum.name.length > 80
    ) {
      throw new Error(`D3 data[${index}].name 无效。`);
    }

    return {
      name: datum.name,
      value: numberInRange(
        datum.value,
        `D3 data[${index}].value`,
        -1_000_000_000,
        1_000_000_000,
      ),
    };
  });

  return { data, type: record.type };
}

function parseThreeObject(
  value: unknown,
  index: number,
): ThreeObjectSpecification {
  const context = `Three.js objects[${index}]`;
  const object = assertRecord(value, context);
  const commonKeys = ['color', 'position', 'rotation', 'type'];
  const color = readColor(object.color, '#7765e8', `${context}.color`);
  const position = readVector3(
    object.position,
    [0, 0, 0],
    `${context}.position`,
    -100,
    100,
  );
  const rotation = readVector3(
    object.rotation,
    [0, 0, 0],
    `${context}.rotation`,
    -12.57,
    12.57,
  );

  if (object.type === 'box') {
    assertAllowedKeys(object, [...commonKeys, 'size'], context);
    return {
      color,
      position,
      rotation,
      size: readVector3(object.size, [1, 1, 1], `${context}.size`, 0.01, 100),
      type: 'box',
    };
  }

  if (object.type === 'plane') {
    assertAllowedKeys(object, [...commonKeys, 'size'], context);
    const size = object.size ?? [4, 4];

    if (!Array.isArray(size) || size.length !== 2) {
      throw new Error(`${context}.size 必须包含两个数字。`);
    }

    return {
      color,
      position,
      rotation,
      size: [
        numberInRange(size[0], `${context}.size[0]`, 0.01, 100),
        numberInRange(size[1], `${context}.size[1]`, 0.01, 100),
      ],
      type: 'plane',
    };
  }

  if (object.type === 'sphere') {
    assertAllowedKeys(object, [...commonKeys, 'radius'], context);
    return {
      color,
      position,
      radius: numberInRange(object.radius ?? 1, `${context}.radius`, 0.01, 50),
      rotation,
      type: 'sphere',
    };
  }

  if (object.type === 'cylinder' || object.type === 'cone') {
    assertAllowedKeys(object, [...commonKeys, 'height', 'radius'], context);
    return {
      color,
      height: numberInRange(object.height ?? 2, `${context}.height`, 0.01, 100),
      position,
      radius: numberInRange(object.radius ?? 1, `${context}.radius`, 0.01, 50),
      rotation,
      type: object.type,
    };
  }

  if (object.type === 'torus') {
    assertAllowedKeys(object, [...commonKeys, 'radius', 'tube'], context);
    const radius = numberInRange(
      object.radius ?? 1,
      `${context}.radius`,
      0.01,
      50,
    );
    const tube = numberInRange(object.tube ?? 0.3, `${context}.tube`, 0.01, 25);

    if (tube >= radius) {
      throw new Error(`${context}.tube 必须小于 radius。`);
    }

    return { color, position, radius, rotation, tube, type: 'torus' };
  }

  throw new Error(
    `${context}.type 仅支持 box、sphere、cylinder、cone、torus 或 plane。`,
  );
}

/** Three.js 仅接受受限基础几何体场景，不允许纹理、模型 URL 或任意代码。 */
export function parseThreeScene(source: string): ThreeSceneSpecification {
  const record = assertRecord(
    parseSafeVisualizationJson(source),
    'Three.js 场景',
  );

  assertAllowedKeys(
    record,
    ['autoRotate', 'background', 'camera', 'objects'],
    'Three.js 场景',
  );

  if (
    !Array.isArray(record.objects) ||
    record.objects.length === 0 ||
    record.objects.length > MAX_THREE_OBJECTS
  ) {
    throw new Error(`Three.js objects 数量必须为 1 到 ${MAX_THREE_OBJECTS}。`);
  }

  const camera =
    record.camera === undefined
      ? {}
      : assertRecord(record.camera, 'Three.js camera');

  assertAllowedKeys(camera, ['position', 'target'], 'Three.js camera');

  if (
    record.autoRotate !== undefined &&
    typeof record.autoRotate !== 'boolean'
  ) {
    throw new Error('Three.js autoRotate 必须是布尔值。');
  }

  return {
    autoRotate: record.autoRotate ?? true,
    background: readColor(record.background, '#f7f8fc', 'Three.js background'),
    camera: {
      position: readVector3(
        camera.position,
        [5, 4, 7],
        'Three.js camera.position',
        -100,
        100,
      ),
      target: readVector3(
        camera.target,
        [0, 0, 0],
        'Three.js camera.target',
        -100,
        100,
      ),
    },
    objects: record.objects.map(parseThreeObject),
  };
}
