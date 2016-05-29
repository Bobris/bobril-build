import * as b from "bobril";
import { Button } from "./button";

const buttonStyle = b.styleDef(
    {
        fontSize: "2em",
        transition: "all 0.5s",
        margin: 5
    },
    {
        "hover":
        {
            background: "#8ca"
        }
    }
);

let counter = 0;
b.init(() => <div>
    <h1>Tsx sample</h1>
    <p>Jsx in bobril is good fast prototyping. Do not use it in performance critical code for now.</p>
    <Button style={buttonStyle} onAction={() => { counter++; b.invalidate() } }>
        Click to increment {counter}
    </Button><br/>
    <Button><b>Bold</b> <i>italic</i></Button>
</div >);
