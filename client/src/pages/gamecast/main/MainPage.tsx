import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { NavigationCard } from "../../../components/gamecast/main/NavigationCard";
import { useNavigate } from "react-router-dom";

export const MainPage = () => {
  const navigate = useNavigate();
  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]" style={{ minWidth: '1821px', minHeight: '1064px' }}>
      <Navigation />
      <main className="flex-1 flex items-center justify-center">
        <NavigationCard />
      </main>
      <Footer />
    </div>
  );
}; 