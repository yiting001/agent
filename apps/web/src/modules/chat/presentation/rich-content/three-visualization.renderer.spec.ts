// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { disposeThreeResources } from './three-visualization.renderer';

describe('disposeThreeResources', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases animation, observers, controls, GPU objects and canvas', () => {
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    const controls = { dispose: vi.fn() };
    const geometry = { dispose: vi.fn() };
    const material = { dispose: vi.fn() };
    const observer = { disconnect: vi.fn() };
    const canvas = document.createElement('canvas');
    const renderer = {
      dispose: vi.fn(),
      domElement: canvas,
      forceContextLoss: vi.fn(),
    };
    const scene = { clear: vi.fn() };

    document.body.append(canvas);
    disposeThreeResources({
      animationFrame: 42,
      controls,
      disposables: [geometry, material],
      observer,
      renderer,
      scene,
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(controls.dispose).toHaveBeenCalledOnce();
    expect(geometry.dispose).toHaveBeenCalledOnce();
    expect(material.dispose).toHaveBeenCalledOnce();
    expect(scene.clear).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
    expect(canvas.isConnected).toBe(false);
  });
});
