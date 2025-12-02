import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "./AudioVisualizer";
import { test, expect } from "vitest";

test("renders and changes based on audio level", () => {
  const { rerender } = render(<AudioVisualizer audioLevel={0} />);
  const visualizer = screen.getByTestId("audio-visualizer");
  expect(visualizer).toBeInTheDocument();
  expect(visualizer).toHaveStyle("transform: scaleY(0)");

  rerender(<AudioVisualizer audioLevel={0.5} />);
  expect(visualizer).toHaveStyle("transform: scaleY(0.5)");

  rerender(<AudioVisualizer audioLevel={1} />);
  expect(visualizer).toHaveStyle("transform: scaleY(1)");
});
