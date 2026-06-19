import { FriendFeedMosaic } from "@/components/FriendFeedMosaic";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold text-koala-primary">도란서재</h1>
        <p className="mt-2 text-koala-muted">
          작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳
        </p>
      </section>

      <FriendFeedMosaic />
    </div>
  );
}
