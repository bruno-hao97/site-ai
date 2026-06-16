const IMAGES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  src: `https://picsum.photos/seed/79ai-${i}/400/${500 + (i % 4) * 90}`,
}));

export default function HomePage() {
  return (
    <div className="home-explore">
      <div className="home-masonry">
        {IMAGES.map((img) => (
          <a
            key={img.id}
            href={img.src}
            className="home-card"
            target="_blank"
            rel="noreferrer"
          >
            <img src={img.src} alt="" loading="lazy" />
          </a>
        ))}
      </div>
    </div>
  );
}
