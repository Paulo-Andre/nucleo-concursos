import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getUserCourseAccess, userHasActiveContestCourse } from "../db";
import { canAccessStudy } from "../studyAccess";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.isBlocked) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireEnrollment = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.isBlocked) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // ROOT/administradores não dependem de matrícula para acessar a plataforma.
  if (ctx.user.role !== "admin") {
    const activeEnrollments = await getUserCourseAccess(ctx.user.id);
    if (!canAccessStudy(ctx.user.role, activeEnrollments.length)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "É necessária uma matrícula vigente para acessar o conteúdo." });
    }
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const enrollmentRequiredProcedure = t.procedure.use(requireEnrollment);

const requireContestEnrollment = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.isBlocked) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (ctx.user.role !== "admin" && !(await userHasActiveContestCourse(ctx.user.id))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta funcionalidade está disponível somente para matrículas ativas em cursos do tipo Concurso." });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const contestEnrollmentRequiredProcedure = t.procedure.use(requireContestEnrollment);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.isBlocked || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
