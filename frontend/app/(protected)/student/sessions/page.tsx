import BookingList from "@/components/BookingList";

export default function Page() {
  return (
    <main className="w-full min-w-0 p-5 sm:p-8">
      <h1 className="mb-6 text-3xl font-semibold">Sessions and history</h1>
      <BookingList />
    </main>
  );
}
