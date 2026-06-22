import { FriendFeedMosaic } from "@/components/FriendFeedMosaic";
import { HomeHeroTitle } from "@/components/HomeHeroTitle";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <HomeHeroTitle />
      </section>

      <FriendFeedMosaic />
    </div>
  );
}
