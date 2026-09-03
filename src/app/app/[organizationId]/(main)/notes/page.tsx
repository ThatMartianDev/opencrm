import NotesPage from "@/modules/notes/NotesPage";
import { getNotes } from "@/modules/notes/actions";

const Page = async () => {
  const initialPage = await getNotes();

  return <NotesPage initialPage={initialPage} />;
};

export default Page;
