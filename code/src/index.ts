import modeling from "@jscad/modeling";

export const main = ()=>{
    //modeling.geometries.geom3
    return [modeling.primitives.sphere({radius:2}),modeling.primitives.circle({radius:10})]
}