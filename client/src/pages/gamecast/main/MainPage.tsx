import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { NavigationCard } from "../../../components/gamecast/main/NavigationCard";

export const MainPage = () => {
  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
      <Navigation />
      <main className="flex-1 flex items-center justify-center">
        <NavigationCard />
      </main>
      <Footer />
    </div>
  );
}; 