import Link from 'next/link';

const MENTION = /((?<![A-Za-z0-9_])@[a-zA-Z0-9_]{3,20})/g;

export default function RichText({ text }) {
  return text.split(MENTION).map((part, i) =>
    /^@[a-zA-Z0-9_]{3,20}$/.test(part) ? (
      <Link key={i} href={`/u/${part.slice(1)}`} className="mention">
        {part}
      </Link>
    ) : (
      part
    )
  );
}
