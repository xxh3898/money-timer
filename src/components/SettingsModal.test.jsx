import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../core";
import SettingsModal from "./SettingsModal";

describe("SettingsModal", () => {
  it("should_renderAccessibleSvgActionIcons_when_breakExists", () => {
    const markup = renderToStaticMarkup(
      <SettingsModal
        settings={{
          ...DEFAULT_SETTINGS,
          breaks: [{ startTime: "12:00", endTime: "13:00", enabled: true }],
        }}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(markup.match(/<svg/g) || []).toHaveLength(4);
    expect(markup).toContain('aria-label="닫기"');
    expect(markup).toContain('aria-label="휴식시간 삭제"');
    expect(markup).toContain("휴식시간 추가");
    expect(markup).toContain("저장하기");
    expect(markup).not.toMatch(/[×−]/);
  });
});
