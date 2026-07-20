import { currentUser } from "@clerk/nextjs/server"
import { Plan } from "@/types/plans"; 
import { auth } from "@clerk/nextjs/server";
import { db } from "./prisma/prisma";
import { PLANS } from "./constant";


const getCurrentPlan = async():Promise<Plan> => {
    const {has} = await auth();

    if(has({ plan: "starter"})) return "starter";
    if(has({plan: "pro"})) return "pro";
    return "free";
}

export const checkUser = async () => {
    const user = await currentUser();
    if(!user) return null;

    try {
        const currentPlan = await getCurrentPlan();

        const existing = await db.user.findUnique({
            where: {clerkId: user.id}
        });

        if(existing){
            if(existing.plan !== currentPlan){
                return await db.user.update({
                    where: {clerkId: user.id},
                    data:{
                        plan: currentPlan,
                        credits: existing.credits + PLANS[currentPlan].credits
                    },
                });
            }

            return existing;          
        }

        //New user - create with free plan credits
            return await db.user.create({
                data:{
                    clerkId: user.id,
                    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                    email: user.emailAddresses[0].emailAddress,
                    imageUrl: user.imageUrl ?? "",
                    credits: PLANS.free.credits,
                    plan: "free",
                }
            })
    } catch (error) {
        console.error("CheckUser Error:", error);
        return null;
    }
}