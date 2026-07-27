export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 text-xs">
        <p className="text-bone/50">
          © {new Date().getFullYear()} MTD Signs & Graphics. All rights reserved.
        </p>
        <a href="#top" className="text-bone/70 transition-colors hover:text-orange">
          Back to top
        </a>
      </div>
    </footer>
  );
}
