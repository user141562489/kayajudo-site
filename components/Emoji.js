import { emojiUrl } from '../lib/twemoji';

export default function Emoji({ char }) {
  return <img className="emoji" src={emojiUrl(char)} alt={char} draggable={false} />;
}
