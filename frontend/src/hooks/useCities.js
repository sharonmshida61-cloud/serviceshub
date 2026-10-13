import { useEffect, useState } from "react";
import { api } from "../api";

// Every city picker in the app shows the same catalogue, so the fetch lives here
// rather than being repeated on each page.
export default function useCities() {
  const [cities, setCities] = useState([]);

  useEffect(() => {
    let alive = true;
    api
      .businessCities()
      .then((list) => {
        if (alive) setCities(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return cities;
}
