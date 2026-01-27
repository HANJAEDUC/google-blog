"use client";

import { useEffect } from "react";

export default function InAppBrowserGuard() {
    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isKakaoContext = /KAKAOTALK/i.test(userAgent);

        if (isKakaoContext) {
            // Create and show warning banner
            const warningDiv = document.createElement("div");
            warningDiv.style.position = "fixed";
            warningDiv.style.top = "0";
            warningDiv.style.left = "0";
            warningDiv.style.width = "100%";
            warningDiv.style.backgroundColor = "#ffeb3b";
            warningDiv.style.color = "#000";
            warningDiv.style.padding = "10px";
            warningDiv.style.textAlign = "center";
            warningDiv.style.zIndex = "9999";
            warningDiv.style.fontSize = "14px";
            warningDiv.style.fontWeight = "bold";
            warningDiv.innerHTML = `
        ⚡️ 카카오톡 인앱 브라우저에서는 음성 재생이 원활하지 않을 수 있습니다.<br/>
        우측 하단 메뉴(⋮)에서 <strong>'다른 브라우저로 열기'</strong>를 권장합니다.
      `;
            document.body.prepend(warningDiv);
        }
    }, []);

    return null;
}
