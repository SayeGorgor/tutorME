import Image from "next/image";

export default function AccountLoading({ text = "Loading your dashboard..." }: { text?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-80 w-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-slate-600"
    >
      <div aria-hidden="true" className="flex size-16 items-center justify-center">
        <Image
          src="/icons/loading_animation_icon.svg"
          alt=""
          width={64}
          height={64}
          className="motion-reduce:hidden"
        />
      </div>
      <p>{text}</p>
    </div>
  );
}
