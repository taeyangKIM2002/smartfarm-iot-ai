# Project Context: @figma/my-make-file

이 프로젝트는 Vite 6와 React 18을 기반으로 하는 고성능 프론트엔드 애플리케이션입니다.

## 🛠 Tech Stack & 핵심 라이브러리

- **Framework**: React 18.3 (TypeScript)
- **Build Tool**: Vite 6.3
- **Styling**:
  - **Tailwind CSS 4.1**: 최신 엔진을 사용하며, 유틸리티 우선 스타일링을 지향함.
  - **MUI (Material UI) 7**: `@mui/material`을 사용한 컴포넌트 활용.
  - **Emotion**: MUI의 스타일 엔진으로 `@emotion/react`, `@emotion/styled` 사용.
- **UI Primitives**: **Radix UI** (Accordion, Dialog, Popover, Select 등 다양한 프리미티브 사용 중).
- **Routing**: **React Router 7** (최신 버전에 맞는 데이터 API 및 라우팅 방식 준수).
- **Animation**: **Motion (Framer Motion 12)**.
- **Forms**: **React Hook Form 7.55**.
- **Charts**: **Recharts 2.15**.
- **Icons**: **Lucide React**.
- **Utilities**: `tailwind-merge`, `clsx`, `date-fns`, `vaul`(Drawer).

## 🎨 Coding Standards & Rules

1. **Component Pattern**:
   - 모든 컴포넌트는 함수형 컴포넌트(`const Component = () => {}`)로 작성한다.
   - Props 정의 시 명확한 TypeScript Interface를 사용한다.
2. **Styling**:
   - 우선순위는 Tailwind CSS 유틸리티 클래스이다. 클래스 결합 시 `cn()` 유틸리티(clsx + tailwind-merge)를 사용한다.
   - 복잡한 UI는 Radix UI Primitives를 기반으로 커스텀하며, 필요한 경우 MUI 컴포넌트를 혼용한다.
3. **Routing**: React Router 7의 새로운 패턴(v7 전용 Hook 및 로더 등)을 권장한다.
4. **State Management**: Form 상태는 `react-hook-form`을 통해 관리하며, 비동기 데이터 처리는 라이브러리 사양에 맞춘다.
5. **Animation**: 애니메이션 추가 시 `motion` 컴포넌트를 사용하며 선언적 방식으로 구현한다.

## 📁 Key File Structure (Expected)

- `/src/components`: UI 컴포넌트 (Radix/MUI 기반)
- `/src/routes` 또는 `/src/views`: 페이지 레벨 컴포넌트
- `/src/hooks`: 커스텀 훅
- `/src/lib`: 유틸리티 함수 (cn, api 클라이언트 등)
