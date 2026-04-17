import Link from 'next/link';
import Flex from '../common/Flex';
import LogoMark from './LogoMark';

export default function Logo() {
  return (
    <Link
      href="/dashboard"
      className="pl-1 flex items-center gap-2.5 cursor-pointer select-none group"
    >
      <LogoMark />
      <Flex align="baseline">
        <span className="text-3xl font-mono font-black italic text-blue-500">4</span>
        <span className="text-2xl font-sans font-black italic tracking-tight text-gray-700 pr-3">
          Ever
        </span>
      </Flex>
    </Link>
  );
}
