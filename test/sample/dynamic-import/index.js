import Hello from "./hello";

import("./world").then((world) => {
  console.log(new Hello(), new World());
});
