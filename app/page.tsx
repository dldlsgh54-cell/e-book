import Link from "next/link";

const highlights = [
  "목차와 본문 초안 자동 생성",
  "대상 독자와 톤에 맞춘 구성",
  "완성된 초안을 PDF로 저장",
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">AI ebook workspace</p>
          <h1>아이디어를 전자책 초안으로 빠르게 정리하세요</h1>
          <p className="hero-description">
            주제, 독자, 톤만 입력하면 목차와 본문 초안을 생성하고 PDF로 저장할 수 있습니다.
            기획부터 초안 작성까지 한 화면에서 매끄럽게 이어집니다.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/dashboard">
              전자책 만들기
            </Link>
            <span className="helper-text">OpenAI API 키만 있으면 바로 시작할 수 있어요.</span>
          </div>
        </div>

        <div className="hero-preview" aria-label="전자책 생성 미리보기">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-body">
            <p className="preview-kicker">Draft outline</p>
            <h2>1인 창업자를 위한 생산성 전략</h2>
            <div className="preview-line wide" />
            <div className="preview-line" />
            <div className="preview-chapters">
              <span>01. 목표 설계</span>
              <span>02. 자동화 루틴</span>
              <span>03. 콘텐츠 확장</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="주요 기능">
        {highlights.map((highlight, index) => (
          <article className="feature-card" key={highlight}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{highlight}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
