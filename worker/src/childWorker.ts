import {postMain,onMainMessage} from '#lib/utils/workerLib.ts'; 

onMainMessage(async (event) => {
    console.log(event)
})