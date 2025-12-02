import { render, screen } from "@testing-library/react";
import { StatusIndicator } from "./StatusIndicator";
import { expect, test } from "vitest";

test("renders connecting status", () => {
  render(<StatusIndicator status="connecting" />);
  expect(screen.getByText("Connecting...")).toBeInTheDocument();
});

test("renders live status", () => {
  render(<StatusIndicator status="live" />);
  expect(screen.getByText("Live")).toBeInTheDocument();
});

test("renders processing status", () => {
  render(<StatusIndicator status="processingResults" />);
  expect(screen.getByText("Processing...")).toBeInTheDocument();
});

test("renders listening status", () => {
  render(<StatusIndicator status="listening" />);
  expect(screen.getByText("Listening")).toBeInTheDocument();
});

test("renders speaking status", () => {
  render(<StatusIndicator status="speaking" />);
  expect(screen.getByText("Speaking")).toBeInTheDocument();
});
