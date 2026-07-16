(function () {
  'use strict';

  const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const EXTERNAL_RESOURCE_PATTERN =
    /(?:^|[\s"'(])(data:|https?:|javascript:|\/\/)/i;
  const GEOMETRY_TYPES = new Set([
    'box',
    'cone',
    'cylinder',
    'plane',
    'sphere',
    'torus',
  ]);

  /**
   * 所有模型图表只接受有界 JSON；不执行回答中的函数、脚本或外链资源。
   */
  function parseSafeJson(source) {
    if (source.length > 100000) {
      throw new Error('可视化配置超过 100000 字符限制。');
    }

    const value = JSON.parse(source);
    let nodes = 0;

    function inspect(current, depth) {
      nodes += 1;

      if (depth > 12 || nodes > 5000) {
        throw new Error('可视化配置结构过于复杂。');
      }

      if (typeof current === 'string') {
        if (EXTERNAL_RESOURCE_PATTERN.test(current)) {
          throw new Error('可视化配置不允许脚本或外链资源。');
        }

        return;
      }

      if (Array.isArray(current)) {
        if (current.length > 1000) {
          throw new Error('可视化数组长度超过限制。');
        }

        current.forEach((item) => inspect(item, depth + 1));
        return;
      }

      if (current && typeof current === 'object') {
        Object.entries(current).forEach(([key, item]) => {
          if (BLOCKED_KEYS.has(key)) {
            throw new Error(`可视化配置包含危险属性：${key}。`);
          }

          inspect(item, depth + 1);
        });
      }
    }

    inspect(value, 0);
    return value;
  }

  function requireObject(value, message) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(message);
    }

    return value;
  }

  function finiteNumber(value, fallback, minimum, maximum) {
    const result = value === undefined ? fallback : Number(value);

    if (!Number.isFinite(result) || result < minimum || result > maximum) {
      throw new Error('三维场景数值无效或超过限制。');
    }

    return result;
  }

  function vector(value, fallback, minimum, maximum) {
    if (value === undefined) {
      return fallback;
    }

    if (!Array.isArray(value) || value.length !== 3) {
      throw new Error('三维向量必须包含三个数字。');
    }

    return value.map((item) => finiteNumber(item, 0, minimum, maximum));
  }

  function color(value, fallback) {
    const result = value === undefined ? fallback : value;

    if (typeof result !== 'string' || !/^#[0-9a-f]{6}$/i.test(result)) {
      throw new Error('三维场景颜色必须是六位十六进制颜色。');
    }

    return result;
  }

  function parseD3(source) {
    const specification = requireObject(
      parseSafeJson(source),
      'D3 配置必须是 JSON 对象。',
    );

    if (
      !['bar', 'line'].includes(specification.type) ||
      !Array.isArray(specification.data) ||
      specification.data.length === 0 ||
      specification.data.length > 100
    ) {
      throw new Error('D3 仅支持包含 1 至 100 条数据的 bar 或 line 图。');
    }

    return {
      data: specification.data.map((item) => {
        const datum = requireObject(item, 'D3 数据项必须是对象。');

        if (
          typeof datum.name !== 'string' ||
          datum.name.length === 0 ||
          datum.name.length > 80 ||
          !Number.isFinite(datum.value)
        ) {
          throw new Error('D3 数据项必须包含有效的 name 和 value。');
        }

        return { name: datum.name, value: datum.value };
      }),
      type: specification.type,
    };
  }

  function parseThree(source) {
    const specification = requireObject(
      parseSafeJson(source),
      'Three.js 配置必须是 JSON 对象。',
    );
    const objects = specification.objects;

    if (
      !Array.isArray(objects) ||
      objects.length === 0 ||
      objects.length > 40
    ) {
      throw new Error('Three.js 场景必须包含 1 至 40 个基础几何体。');
    }

    allowedKeys(
      specification,
      ['autoRotate', 'background', 'camera', 'objects'],
      'Three.js 场景',
    );

    if (
      specification.autoRotate !== undefined &&
      typeof specification.autoRotate !== 'boolean'
    ) {
      throw new Error('Three.js autoRotate 必须是布尔值。');
    }

    const camera =
      specification.camera === undefined
        ? {}
        : requireObject(specification.camera, 'Three.js camera 配置无效。');

    allowedKeys(camera, ['position', 'target'], 'Three.js camera');

    return {
      autoRotate: specification.autoRotate !== false,
      background: color(specification.background, '#f7f8fc'),
      camera: {
        position: vector(camera.position, [5, 4, 7], -100, 100),
        target: vector(camera.target, [0, 0, 0], -100, 100),
      },
      objects: objects.map(parseThreeObject),
    };
  }

  function allowedKeys(object, allowed, context) {
    const unknown = Object.keys(object).find((key) => !allowed.includes(key));

    if (unknown) {
      throw new Error(`${context} 不支持属性 ${unknown}。`);
    }
  }

  function parseThreeObject(item, index) {
    const context = `Three.js objects[${index}]`;
    const object = requireObject(item, `${context} 配置无效。`);
    const common = ['color', 'position', 'rotation', 'type'];
    const shared = {
      color: color(object.color, '#7765e8'),
      position: vector(object.position, [0, 0, 0], -100, 100),
      rotation: vector(object.rotation, [0, 0, 0], -12.57, 12.57),
      type: object.type,
    };

    if (!GEOMETRY_TYPES.has(object.type)) {
      throw new Error('Three.js 仅支持预设的基础几何体。');
    }

    if (object.type === 'box') {
      allowedKeys(object, [...common, 'size'], context);
      return {
        ...shared,
        size: vector(object.size, [1, 1, 1], 0.01, 100),
      };
    }

    if (object.type === 'plane') {
      allowedKeys(object, [...common, 'size'], context);
      const size = object.size === undefined ? [4, 4] : object.size;

      if (!Array.isArray(size) || size.length !== 2) {
        throw new Error(`${context}.size 必须包含两个数字。`);
      }

      return {
        ...shared,
        size: [
          finiteNumber(size[0], 4, 0.01, 100),
          finiteNumber(size[1], 4, 0.01, 100),
        ],
      };
    }

    if (object.type === 'sphere') {
      allowedKeys(object, [...common, 'radius'], context);
      return {
        ...shared,
        radius: finiteNumber(object.radius, 1, 0.01, 50),
      };
    }

    if (object.type === 'cylinder' || object.type === 'cone') {
      allowedKeys(object, [...common, 'height', 'radius'], context);
      return {
        ...shared,
        height: finiteNumber(object.height, 2, 0.01, 100),
        radius: finiteNumber(object.radius, 1, 0.01, 50),
      };
    }

    allowedKeys(object, [...common, 'radius', 'tube'], context);
    const radius = finiteNumber(object.radius, 1, 0.01, 50);
    const tube = finiteNumber(object.tube, 0.3, 0.01, 25);

    if (tube >= radius) {
      throw new Error(`${context}.tube 必须小于 radius。`);
    }

    return { ...shared, radius, tube };
  }

  async function renderD3(element, source, loadAsset) {
    await loadAsset('d3', 'script');
    const specification = parseD3(source);
    const d3 = window.d3;
    const width = Math.max(element.clientWidth, 560);
    const height = 340;
    const margin = { bottom: 52, left: 52, right: 24, top: 24 };
    const x = d3
      .scaleBand()
      .domain(specification.data.map((item) => item.name))
      .range([margin.left, width - margin.right])
      .padding(0.28);
    const minimum = d3.min(specification.data, (item) => item.value) || 0;
    const maximum = d3.max(specification.data, (item) => item.value) || 0;
    const y = d3
      .scaleLinear()
      .domain([Math.min(0, minimum), Math.max(0, maximum)])
      .nice()
      .range([height - margin.bottom, margin.top]);
    const svg = d3
      .select(element)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img');

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));
    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    if (specification.type === 'line') {
      const line = d3
        .line()
        .x((item) => (x(item.name) || 0) + x.bandwidth() / 2)
        .y((item) => y(item.value));

      svg
        .append('path')
        .datum(specification.data)
        .attr('class', 'chat-d3-line')
        .attr('d', line);
      return;
    }

    svg
      .append('g')
      .selectAll('rect')
      .data(specification.data)
      .join('rect')
      .attr('x', (item) => x(item.name))
      .attr('y', (item) => y(Math.max(0, item.value)))
      .attr('width', x.bandwidth())
      .attr('height', (item) => Math.abs(y(item.value) - y(0)))
      .attr('rx', 5);
  }

  function geometry(three, object) {
    switch (object.type) {
      case 'sphere':
        return new three.SphereGeometry(object.radius, 32, 20);
      case 'cylinder':
        return new three.CylinderGeometry(
          object.radius,
          object.radius,
          object.height,
          32,
        );
      case 'cone':
        return new three.ConeGeometry(object.radius, object.height, 32);
      case 'torus':
        return new three.TorusGeometry(object.radius, object.tube, 16, 48);
      case 'plane':
        return new three.PlaneGeometry(object.size[0], object.size[1]);
      default:
        return new three.BoxGeometry(
          object.size[0],
          object.size[1],
          object.size[2],
        );
    }
  }

  async function renderThree(element, source, loadModule) {
    const three = await loadModule('three');
    const specification = parseThree(source);
    const scene = new three.Scene();
    const group = new three.Group();
    const camera = new three.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new three.WebGLRenderer({ antialias: true, alpha: false });
    const resources = [];

    scene.background = new three.Color(specification.background);
    scene.add(group);
    scene.add(new three.AmbientLight(0xffffff, 1.2));
    const directional = new three.DirectionalLight(0xffffff, 1.8);
    directional.position.set(5, 8, 6);
    scene.add(directional);
    camera.position.set(...specification.camera.position);
    camera.lookAt(...specification.camera.target);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'chat-visualization__canvas';
    element.append(renderer.domElement);

    specification.objects.forEach((object) => {
      const shape = geometry(three, object);
      const material = new three.MeshStandardMaterial({
        color: object.color,
        side: three.DoubleSide,
      });
      const mesh = new three.Mesh(shape, material);
      mesh.position.set(...object.position);
      mesh.rotation.set(...object.rotation);
      group.add(mesh);
      resources.push(shape, material);
    });

    function resize() {
      const width = Math.max(element.clientWidth, 320);
      const height = 360;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    }

    const observer = new ResizeObserver(resize);
    let animationFrame = 0;

    function animate() {
      if (specification.autoRotate) {
        group.rotation.y += 0.004;
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    }

    resize();
    observer.observe(element);
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      resources.forEach((resource) => resource.dispose());
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }

  function create(options) {
    return {
      async render(element, type, source) {
        if (type === 'd3') {
          await renderD3(element, source, options.loadAsset);
          return undefined;
        }

        if (type === 'three') {
          return renderThree(element, source, options.loadModule);
        }

        throw new Error('不支持的扩展可视化类型。');
      },
    };
  }

  window.AgentRichVisualizations = { create, parseSafeJson };
})();
